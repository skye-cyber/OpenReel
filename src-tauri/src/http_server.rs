use std::net::SocketAddr;
use std::path::{Path, PathBuf};

use axum::{
    extract::Query,
    http::{header, HeaderMap, StatusCode},
    response::{IntoResponse, Response},
    routing::get,
    Router,
};
use serde::Deserialize;
use tower::ServiceExt;
use tower_http::cors::{Any, CorsLayer};
use tower_http::services::ServeFile;
use tauri::AppHandle;
use tauri::Manager;

/// The bound address of the stream server, stored in Tauri state so
/// `get_stream_port` can retrieve it.
pub struct ServerAddr(pub u16);

#[derive(Deserialize)]
struct StreamQuery {
    path: String,
}

/// Start the loopback HTTP server on an ephemeral port.
///
/// Returns the bound address so the frontend can construct URLs.
/// The server runs for the lifetime of the app.
pub async fn start() -> Result<SocketAddr, String> {
    let app = Router::new()
    .route("/stream", get(stream_handler))
    .layer(
        CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any)
        .expose_headers([
            header::CONTENT_RANGE,
            header::CONTENT_LENGTH,
            header::ACCEPT_RANGES,
        ]),
    );

    let listener = tokio::net::TcpListener::bind("127.0.0.1:0")
    .await
    .map_err(|e| format!("bind: {e}"))?;

    let addr = listener.local_addr().map_err(|e| format!("local_addr: {e}"))?;

    tokio::spawn(async move {
        if let Err(e) = axum::serve(listener, app).await {
            log::error!("HTTP stream server error: {e}");
        }
    });

    log::info!("Stream server listening on http://{addr}");
    Ok(addr)
}

async fn stream_handler(
    Query(q): Query<StreamQuery>,
                        headers: HeaderMap,
) -> Response {
    // Canonicalize before the allowlist check so that
    // `/home/skye/../etc/passwd` doesn't slip through a starts_with
    // check on the raw path.
    let raw = PathBuf::from(&q.path);
    let canonical = match raw.canonicalize() {
        Ok(p) => p,
        Err(_) => {
            return (StatusCode::NOT_FOUND, "file not found").into_response();
        }
    };

    if !is_path_allowed(&canonical) {
        return (StatusCode::FORBIDDEN, "path not allowed").into_response();
    }

    // Build a request for tower-http's ServeFile service, copying the
    // Range header from the incoming request so partial-content serving
    // works for <video> seeking.
    let mut req = axum::http::Request::builder()
    .uri("/")
    .body(axum::body::Body::empty())
    .unwrap();
    if let Some(range) = headers.get(header::RANGE) {
        req.headers_mut().insert(header::RANGE, range.clone());
    }

    // ServeFile is Clone, so we can build a fresh instance per request.
    let service = ServeFile::new(&canonical);

    match service.oneshot(req).await {
        Ok(response) => response.into_response(),
        Err(e) => {
            log::error!("ServeFile error for {}: {e}", canonical.display());
            (StatusCode::INTERNAL_SERVER_ERROR, "serve error").into_response()
        }
    }
}

/// Allow only paths under the user's home directory and standard media
/// mounts. `path` must be canonicalized before calling this.
fn is_path_allowed(path: &Path) -> bool {
    let Some(path_str) = path.to_str() else { return false };
    let home = match dirs::home_dir() {
        Some(h) => h,
        None => return false,
    };
    let home_str = home.to_string_lossy();

    path_str.starts_with(&*home_str)
    || path_str.starts_with("/run/media/")
    || path_str.starts_with("/media/")
    || path_str.starts_with("/mnt/")
}

#[tauri::command]
pub fn get_stream_port(app: AppHandle) -> Result<u16, String> {
    app.try_state::<ServerAddr>()
    .map(|s| s.0)
    .ok_or_else(|| "Stream server not ready".to_string())
}
