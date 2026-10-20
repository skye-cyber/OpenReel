use std::fs::File;
use std::io::{Read, Seek, SeekFrom};
use tauri::http::{header, Request, Response, StatusCode};
use tauri::UriSchemeResponder;

/// Maximum bytes returned in a single range response.
/// Prevents allocating multi-gigabyte buffers for a seek to the middle
/// of a large file. The WebView will issue subsequent range requests as
/// needed.
const MAX_CHUNK: u64 = 1024 * 1024; // 1 MB

pub fn register(builder: tauri::Builder<tauri::Wry>) -> tauri::Builder<tauri::Wry> {
    builder.register_asynchronous_uri_scheme_protocol(
        "stream",
        move |_ctx, request, responder| {
            let result = handle_request(&request);
            responder.respond(result);
        },
    )
}

fn handle_request(request: &Request<Vec<u8>>) -> Response<Vec<u8>> {
    // Decode the path. URI is like stream://localhost/%2Fhome%2F...
    let raw_uri = request.uri().path();
    let path = percent_decode(raw_uri);

    let file = match File::open(&path) {
        Ok(f) => f,
        Err(e) => {
            return error_response(StatusCode::NOT_FOUND, &format!("open {path}: {e}"));
        }
    };

    let len = match file.metadata() {
        Ok(m) => m.len(),
        Err(e) => {
            return error_response(StatusCode::INTERNAL_SERVER_ERROR, &format!("metadata: {e}"));
        }
    };

    // Parse Range header if present.
    let range_header = request
        .headers()
        .get(header::RANGE)
        .and_then(|v| v.to_str().ok());

    match range_header {
        Some(h) => serve_range(file, len, h),
        None => serve_whole(file, len),
    }
}

/// Full-file response (no Range header).
fn serve_whole(mut file: File, len: u64) -> Response<Vec<u8>> {
    // If the WebView didn't send Range, we have to serve the whole file.
    // Refuse files over a size we're willing to buffer.
    const MAX_WHOLE_FILE: u64 = 64 * 1024 * 1024; // 64 MB
    if len > MAX_WHOLE_FILE {
        return error_response(
            StatusCode::RANGE_NOT_SATISFIABLE,
            &format!("file too large to serve without range support ({len} bytes)"),
        );
    }
    let mut buf = vec![0u8; len as usize];
    if file.read_exact(&mut buf).is_err() {
        return error_response(StatusCode::INTERNAL_SERVER_ERROR, "read failed");
    }

    let mime = guess_mime(&file);
    Response::builder()
        .status(StatusCode::OK)
        .header(header::CONTENT_TYPE, mime)
        .header(header::CONTENT_LENGTH, len)
        .header(header::ACCEPT_RANGES, "bytes")
        .header(header::ACCESS_CONTROL_ALLOW_ORIGIN, "*")
        .body(buf)
        .unwrap_or_else(|_| error_response(StatusCode::INTERNAL_SERVER_ERROR, "build response"))
}


/// Partial-content response (Range header present).
fn serve_range(mut file: File, len: u64, range_header: &str) -> Response<Vec<u8>> {
    let ranges = match parse_ranges(range_header, len) {
        Some(r) if !r.is_empty() => r,
        _ => {
            return Response::builder()
                .status(StatusCode::RANGE_NOT_SATISFIABLE)
                .header(header::CONTENT_RANGE, format!("bytes */{len}"))
                .header(header::ACCESS_CONTROL_ALLOW_ORIGIN, "*")
                .header(header::ACCESS_CONTROL_EXPOSE_HEADERS, "Content-Range, Content-Length, Accept-Ranges")
                .body(Vec::new())
                .unwrap_or_else(|_| error_response(StatusCode::INTERNAL_SERVER_ERROR, "build 416"));
        }
    };

    if ranges.len() == 1 {
        let (start, end) = ranges[0];
        let bytes_to_read = end - start + 1;
        let mut buf = vec![0u8; bytes_to_read as usize];
        if file.seek(SeekFrom::Start(start)).is_err()
            || file.read_exact(&mut buf).is_err()
        {
            return error_response(StatusCode::INTERNAL_SERVER_ERROR, "seek/read failed");
        }

        Response::builder()
            .status(StatusCode::PARTIAL_CONTENT)
            .header(header::CONTENT_TYPE, guess_mime(&file))
            .header(header::CONTENT_RANGE, format!("bytes {start}-{end}/{len}"))
            .header(header::CONTENT_LENGTH, bytes_to_read)
            .header(header::ACCEPT_RANGES, "bytes")
            .header(header::ACCESS_CONTROL_ALLOW_ORIGIN, "*")
            // WebView needs to see Content-Range and Accept-Ranges to know it can seek.
            .header(header::ACCESS_CONTROL_EXPOSE_HEADERS, "Content-Range, Content-Length, Accept-Ranges")
            .body(buf)
            .unwrap_or_else(|_| error_response(StatusCode::INTERNAL_SERVER_ERROR, "build 206"))
    } else {
        serve_multipart(file, len, &ranges)
    }
}

/// Multi-range response using multipart/byteranges.
fn serve_multipart(
    mut file: File,
    len: u64,
    ranges: &[(u64, u64)],
) -> Response<Vec<u8>> {
    let boundary = format!("openreel-{}", std::process::id());
    let mime = guess_mime(&file);
    let mut body = Vec::new();

    for (i, &(start, end)) in ranges.iter().enumerate() {
        let bytes_to_read = end - start + 1;
        let mut chunk = vec![0u8; bytes_to_read as usize];
        if file.seek(SeekFrom::Start(start)).is_err()
            || file.read_exact(&mut chunk).is_err()
        {
            return error_response(StatusCode::INTERNAL_SERVER_ERROR, "multipart read failed");
        }

        if i > 0 {
            body.extend_from_slice(b"\r\n");
        }
        body.extend_from_slice(format!("--{boundary}\r\n").as_bytes());
        body.extend_from_slice(format!("Content-Type: {mime}\r\n").as_bytes());
        body.extend_from_slice(
            format!("Content-Range: bytes {start}-{end}/{len}\r\n\r\n").as_bytes(),
        );
        body.extend_from_slice(&chunk);
    }
    body.extend_from_slice(format!("\r\n--{boundary}--\r\n").as_bytes());

    Response::builder()
        .status(StatusCode::PARTIAL_CONTENT)
        .header(
            header::CONTENT_TYPE,
            format!("multipart/byteranges; boundary={boundary}"),
        )
        .header(header::ACCESS_CONTROL_ALLOW_ORIGIN, "*")
        // WebView needs to see Content-Range and Accept-Ranges to know it can seek.
        .header(header::ACCESS_CONTROL_EXPOSE_HEADERS, "Content-Range, Content-Length, Accept-Ranges")
        .header(header::ACCEPT_RANGES, "bytes")
        .body(body)
        .unwrap_or_else(|_| error_response(StatusCode::INTERNAL_SERVER_ERROR, "build multipart"))
}

/// Parse a Range header like "bytes=0-1023" or "bytes=0-1023,2048-4095".
/// Returns None if unparseable.
fn parse_ranges(header: &str, file_len: u64) -> Option<Vec<(u64, u64)>> {
    let rest = header.strip_prefix("bytes=")?;
    let mut ranges = Vec::new();

    for part in rest.split(',') {
        let part = part.trim();
        let (start_str, end_str) = part.split_once('-')?;
        let start: u64 = start_str.parse().ok()?;

        let end: u64 = if end_str.is_empty() {
            file_len.saturating_sub(1)
        } else {
            end_str.parse().ok()?
        };

        if start >= file_len || end < start {
            continue;
        }
        let clamped_end = end.min(file_len - 1);
        let limited_end = start.saturating_add(MAX_CHUNK - 1).min(clamped_end);
        ranges.push((start, limited_end));
    }

    Some(ranges)
}

/// Percent-decode a URI path component.
fn percent_decode(input: &str) -> String {
    let bytes = input.as_bytes();
    let mut out = Vec::with_capacity(bytes.len());
    let mut i = 0;
    while i < bytes.len() {
        if bytes[i] == b'%' && i + 2 < bytes.len() {
            if let (Some(h), Some(l)) = (hex_val(bytes[i + 1]), hex_val(bytes[i + 2])) {
                out.push(h * 16 + l);
                i += 3;
                continue;
            }
        }
        out.push(bytes[i]);
        i += 1;
    }
    String::from_utf8_lossy(&out).into_owned()
}

fn hex_val(b: u8) -> Option<u8> {
    match b {
        b'0'..=b'9' => Some(b - b'0'),
        b'a'..=b'f' => Some(b - b'a' + 10),
        b'A'..=b'F' => Some(b - b'A' + 10),
        _ => None,
    }
}

fn guess_mime(file: &File) -> &'static str {
    // Use the file extension. Not exhaustive — extend as needed.
    let path = file_path_hint(file);
    let ext = path
        .rsplit('.')
        .next()
        .unwrap_or("")
        .to_ascii_lowercase();
    match ext.as_str() {
        "mp4" | "m4v" => "video/mp4",
        "webm" => "video/webm",
        "mkv" => "video/x-matroska",
        "mp3" => "audio/mpeg",
        "flac" => "audio/flac",
        "wav" => "audio/wav",
        "m4a" => "audio/mp4",
        "ogg" => "audio/ogg",
        "opus" => "audio/opus",
        _ => "application/octet-stream",
    }
}

fn file_path_hint(_file: &File) -> &'static str {
    // Placeholder — we don't have the path inside File.
    // Real implementation should pass the path through or read from
    // the extension before opening. For now, default to octet-stream.
    "unknown"
}

fn error_response(status: StatusCode, msg: &str) -> Response<Vec<u8>> {
    log::warn!("stream protocol error: {msg}");
    Response::builder()
        .status(status)
        .header(header::CONTENT_TYPE, "text/plain")
        .header(header::ACCESS_CONTROL_ALLOW_ORIGIN, "*")
        .body(msg.as_bytes().to_vec())
        .unwrap_or_else(|_| Response::new(Vec::new()))
}
