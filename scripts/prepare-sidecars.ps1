# Fetch and stage FFmpeg/FFprobe sidecars for the current platform.
# Run once after cloning, and after any `git clean`.
$ErrorActionPreference = 'Stop'

# Move to repo root (script lives in scripts/).
$RepoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $RepoRoot

$BinDir = Join-Path $RepoRoot 'src-tauri\binaries'
New-Item -ItemType Directory -Path $BinDir -Force | Out-Null

# Detect target triple from rustc.
$HostLine = & rustc -vV | Select-String '^host:'
if (-not $HostLine) { throw 'rustc not found on PATH' }
$Triple = ($HostLine -split ' ')[1].Trim()

$FfmpegPath  = Join-Path $BinDir "openreel-ffmpeg-$Triple.exe"
$FfprobePath = Join-Path $BinDir "openreel-ffprobe-$Triple.exe"

if ((Test-Path $FfmpegPath) -and (Test-Path $FfprobePath)) {
    Write-Host "Sidecars already present for $Triple"
    exit 0
}

# Windows builds from gyan.dev are the standard static option.
# The "essentials" build includes libx264 and the usual demuxers.
$Url = 'https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip'
$Zip = Join-Path $env:TEMP 'ffmpeg-release-essentials.zip'
$Extract = Join-Path $env:TEMP 'openreel-ffmpeg-extract'

Write-Host "Fetching $Url"
Invoke-WebRequest -Uri $Url -OutFile $Zip

if (Test-Path $Extract) { Remove-Item $Extract -Recurse -Force }
Expand-Archive -LiteralPath $Zip -DestinationPath $Extract -Force

# The archive contains a versioned top-level folder.
$Top = Get-ChildItem -LiteralPath $Extract -Directory | Select-Object -First 1
if (-not $Top) { throw 'Unexpected FFmpeg archive layout' }

Copy-Item (Join-Path $Top.FullName 'bin\ffmpeg.exe')  $FfmpegPath  -Force
Copy-Item (Join-Path $Top.FullName 'bin\ffprobe.exe') $FfprobePath -Force

Remove-Item $Zip -Force
Remove-Item $Extract -Recurse -Force

Write-Host "Sidecars staged for $Triple"
