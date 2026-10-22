use serde::Serialize;
use std::collections::{HashMap, HashSet};
use std::io::{BufReader, Read};
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{mpsc, Arc, Mutex};
use std::thread;
use std::time::Duration;
use tauri::{AppHandle, Emitter, Manager, State};

#[derive(Clone, Default)]
pub struct EngineRuns(Arc<Mutex<HashMap<String, Arc<AtomicBool>>>>);

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EngineInfo {
    pub id: String,
    pub path: String,
    pub version: String,
    pub build_configuration: String,
    pub encoders: Vec<String>,
    pub filters: Vec<String>,
    pub bundled: bool,
    pub compatible: bool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EngineCatalog {
    pub bundled: Option<EngineInfo>,
    pub system: Vec<EngineInfo>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RunSummary {
    pub success: bool,
    pub exit_code: Option<i32>,
    pub log: String,
    pub cancelled: bool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NativeFileInfo {
    pub path: String,
    pub name: String,
    pub size: u64,
    pub file_type: String,
}

fn output_text(output: &std::process::Output) -> String {
    format!(
        "{}{}",
        String::from_utf8_lossy(&output.stdout),
        String::from_utf8_lossy(&output.stderr)
    )
}

fn contains_token(lines: &str, expected: &str) -> bool {
    lines
        .lines()
        .any(|line| line.split_whitespace().any(|token| token == expected))
}

fn list_tokens(lines: &str, code_column: usize, flag_length: usize) -> Vec<String> {
    let mut found = HashSet::new();
    for line in lines.lines() {
        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.len() > code_column
            && parts[0].len() == flag_length
            && parts[0].chars().all(|ch| ch == '.' || ch.is_ascii_alphabetic())
        {
            found.insert(parts[code_column].to_string());
        }
    }
    let mut values: Vec<String> = found.into_iter().collect();
    values.sort();
    values
}

fn probe(path: &Path, bundled: bool) -> Result<EngineInfo, String> {
    let path = path
        .canonicalize()
        .map_err(|_| "That FFmpeg path could not be opened.".to_string())?;
    if !path.is_file() {
        return Err("That path is not a file.".to_string());
    }
    let version_output = Command::new(&path)
        .arg("-version")
        .output()
        .map_err(|e| format!("Could not start FFmpeg: {e}"))?;
    if !version_output.status.success() {
        return Err("This file did not respond to the FFmpeg version check.".to_string());
    }
    let version_text = output_text(&version_output);
    let version = version_text
        .lines()
        .next()
        .and_then(|line| line.split_whitespace().nth(2))
        .unwrap_or("unknown")
        .to_string();

    let build_output = Command::new(&path)
        .arg("-buildconf")
        .output()
        .map_err(|e| format!("Could not inspect FFmpeg build options: {e}"))?;
    let build_configuration = output_text(&build_output);
    let encoder_output = Command::new(&path)
        .arg("-encoders")
        .output()
        .map_err(|e| format!("Could not inspect FFmpeg encoders: {e}"))?;
    let encoders_text = output_text(&encoder_output);
    let filter_output = Command::new(&path)
        .arg("-filters")
        .output()
        .map_err(|e| format!("Could not inspect FFmpeg filters: {e}"))?;
    let filters_text = output_text(&filter_output);

    let has_video_encoder = contains_token(&encoders_text, "h264_videotoolbox")
        || contains_token(&encoders_text, "libx264");
    let compatible = has_video_encoder
        && contains_token(&encoders_text, "aac")
        && contains_token(&filters_text, "scale")
        && contains_token(&filters_text, "crop");
    let id = if bundled {
        "bundled".to_string()
    } else {
        path.to_string_lossy().to_string()
    };

    Ok(EngineInfo {
        id,
        path: path.to_string_lossy().to_string(),
        version,
        build_configuration,
        encoders: list_tokens(&encoders_text, 1, 6),
        filters: list_tokens(&filters_text, 1, 3),
        bundled,
        compatible,
    })
}

fn bundled_candidates(app: &AppHandle) -> Vec<PathBuf> {
    let target_name = "ffmpeg-aarch64-apple-darwin";
    let mut result = Vec::new();
    if let Ok(current_exe) = std::env::current_exe() {
        if let Some(parent) = current_exe.parent() {
            result.push(parent.join(target_name));
        }
    }
    result.push(Path::new(env!("CARGO_MANIFEST_DIR")).join("binaries").join(target_name));
    if let Ok(resource_dir) = app.path().resource_dir() {
        result.push(resource_dir.join(target_name));
        result.push(resource_dir.join("binaries").join(target_name));
    }
    result
}

fn bundled_engine(app: &AppHandle) -> Option<EngineInfo> {
    bundled_candidates(app)
        .into_iter()
        .find_map(|candidate| probe(&candidate, true).ok())
}

fn is_media_path(path: &Path) -> bool {
    matches!(
        path.extension()
            .and_then(|ext| ext.to_str())
            .unwrap_or("")
            .to_ascii_lowercase()
            .as_str(),
        "mp4" | "m4v" | "mov" | "mkv" | "webm" | "avi" | "wmv" | "flv" | "mpg"
            | "mpeg" | "ts" | "3gp" | "ogv" | "mp3" | "wav" | "m4a" | "aac"
            | "flac" | "ogg" | "opus" | "gif"
    )
}

fn walk_media(path: &Path, found: &mut Vec<NativeFileInfo>, depth: usize) -> Result<(), String> {
    if depth > 24 || found.len() >= 5000 {
        return Ok(());
    }
    let metadata = std::fs::symlink_metadata(path)
        .map_err(|e| format!("Could not read {}: {e}", path.display()))?;
    if metadata.file_type().is_symlink() {
        return Ok(());
    }
    if metadata.is_dir() {
        let entries = std::fs::read_dir(path)
            .map_err(|e| format!("Could not open folder {}: {e}", path.display()))?;
        for entry in entries.flatten() {
            walk_media(&entry.path(), found, depth + 1)?;
            if found.len() >= 5000 {
                break;
            }
        }
    } else if metadata.is_file() && is_media_path(path) {
        let path = path
            .canonicalize()
            .map_err(|e| format!("Could not resolve media path: {e}"))?;
        let name = path
            .file_name()
            .and_then(|name| name.to_str())
            .unwrap_or("media")
            .to_string();
        found.push(NativeFileInfo {
            path: path.to_string_lossy().to_string(),
            name,
            size: metadata.len(),
            file_type: path
                .extension()
                .and_then(|ext| ext.to_str())
                .unwrap_or("")
                .to_ascii_lowercase(),
        });
    }
    Ok(())
}

#[tauri::command]
pub fn list_media_files(paths: Vec<String>) -> Result<Vec<NativeFileInfo>, String> {
    let mut found = Vec::new();
    for path in paths {
        walk_media(Path::new(&path), &mut found, 0)?;
    }
    found.sort_by(|a, b| a.path.cmp(&b.path));
    Ok(found)
}

fn system_candidates() -> Vec<PathBuf> {
    let mut result = Vec::new();
    if let Some(path) = std::env::var_os("PATH") {
        result.extend(std::env::split_paths(&path).map(|dir| dir.join("ffmpeg")));
    }
    // GUI apps launched from Finder often receive a shorter PATH than terminal apps.
    result.extend([
        PathBuf::from("/opt/homebrew/bin/ffmpeg"),
        PathBuf::from("/usr/local/bin/ffmpeg"),
        PathBuf::from("/usr/bin/ffmpeg"),
    ]);
    result
}

#[tauri::command]
pub fn default_output_directory(app: AppHandle) -> Result<String, String> {
    let path = app
        .path()
        .download_dir()
        .map_err(|_| "The Downloads folder could not be found.".to_string())?;
    Ok(path.to_string_lossy().to_string())
}

#[tauri::command]
pub fn detect_ffmpeg_engines(app: AppHandle) -> EngineCatalog {
    let bundled = bundled_engine(&app);
    let mut seen = HashSet::new();
    let system = system_candidates()
        .into_iter()
        .filter_map(|path| {
            let canonical = path.canonicalize().ok()?;
            if !seen.insert(canonical.clone())
                || bundled.as_ref().is_some_and(|b| b.path == canonical.to_string_lossy().as_ref())
            {
                return None;
            }
            probe(&canonical, false).ok()
        })
        .collect();
    EngineCatalog { bundled, system }
}

#[tauri::command]
pub fn probe_ffmpeg(path: String) -> Result<EngineInfo, String> {
    probe(Path::new(&path), false)
}

fn parse_time(line: &str) -> Option<f64> {
    let value = line.split_once("time=")?.1.split_whitespace().next()?;
    let mut parts = value.split(':');
    let hours: f64 = parts.next()?.parse().ok()?;
    let minutes: f64 = parts.next()?.parse().ok()?;
    let seconds: f64 = parts.next()?.parse().ok()?;
    Some(hours * 3600.0 + minutes * 60.0 + seconds)
}

fn probe_duration(engine_path: &Path, args: &[String]) -> Option<f64> {
    let input = args
        .windows(2)
        .find(|pair| pair[0] == "-i")
        .map(|pair| Path::new(&pair[1]))?;
    let ffprobe = engine_path.with_file_name(
        engine_path
            .file_name()?
            .to_string_lossy()
            .replace("ffmpeg", "ffprobe"),
    );
    let out = Command::new(ffprobe)
        .args([
            "-v",
            "error",
            "-show_entries",
            "format=duration",
            "-of",
            "default=noprint_wrappers=1:nokey=1",
        ])
        .arg(input)
        .output()
        .ok()?;
    String::from_utf8_lossy(&out.stdout).trim().parse().ok()
}

fn run_sync(
    app: AppHandle,
    run_id: String,
    engine_path: String,
    mut args: Vec<String>,
    cancelled: Arc<AtomicBool>,
) -> Result<RunSummary, String> {
    let engine = PathBuf::from(engine_path);
    if !engine.is_file() {
        return Err("The selected FFmpeg executable is no longer available.".to_string());
    }
    let duration = probe_duration(&engine, &args);
    // FFmpeg's own progress line is emitted on stderr and works with bundled and system builds.
    let output_index = args.len().saturating_sub(1);
    args.splice(output_index..output_index, ["-stats_period".into(), "0.5".into()]);

    let mut child = Command::new(&engine)
        .args(&args)
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Could not start FFmpeg: {e}"))?;
    let stderr = child.stderr.take().ok_or("Could not capture FFmpeg output")?;
    let (sender, receiver) = mpsc::channel::<String>();
    let reader = thread::spawn(move || {
        let mut reader = BufReader::new(stderr);
        let mut chunk = [0_u8; 4096];
        let mut line = Vec::new();
        loop {
            let read = match reader.read(&mut chunk) {
                Ok(read) => read,
                Err(_) => break,
            };
            if read == 0 {
                if !line.is_empty() {
                    let _ = sender.send(String::from_utf8_lossy(&line).into_owned());
                }
                break;
            }
            for byte in &chunk[..read] {
                if *byte == b'\r' || *byte == b'\n' {
                    if !line.is_empty() {
                        let text = String::from_utf8_lossy(&line).into_owned();
                        line.clear();
                        if sender.send(text).is_err() {
                            return;
                        }
                    }
                } else {
                    line.push(*byte);
                }
            }
        }
    });

    let mut log = String::new();
    let mut did_cancel = false;
    let status = loop {
        if cancelled.load(Ordering::SeqCst) && !did_cancel {
            let _ = child.kill();
            did_cancel = true;
        }
        if let Some(result) = child.try_wait().map_err(|e| format!("Could not wait for FFmpeg: {e}"))? {
            break result;
        }
        if let Ok(line) = receiver.recv_timeout(Duration::from_millis(100)) {
            if let (Some(total), Some(current)) = (duration, parse_time(&line)) {
                let ratio = (current / total).clamp(0.0, 0.99) as f32;
                let _ = app.emit("ffmpeg-progress", serde_json::json!({ "runId": run_id, "ratio": ratio }));
            }
            let _ = app.emit("ffmpeg-log", serde_json::json!({ "runId": run_id, "line": line }));
            if log.len() < 250_000 {
                log.push_str(&line);
                log.push('\n');
            }
        }
    };
    let _ = reader.join();
    for line in receiver.try_iter() {
        let _ = app.emit("ffmpeg-log", serde_json::json!({ "runId": run_id, "line": line }));
        if log.len() < 250_000 {
            log.push_str(&line);
            log.push('\n');
        }
    }
    let success = status.success() && !did_cancel;
    if success {
        let _ = app.emit("ffmpeg-progress", serde_json::json!({ "runId": run_id, "ratio": 1.0 }));
    }
    Ok(RunSummary {
        success,
        exit_code: status.code(),
        log,
        cancelled: did_cancel,
    })
}

#[tauri::command]
pub async fn run_ffmpeg(
    app: AppHandle,
    runs: State<'_, EngineRuns>,
    run_id: String,
    engine_path: String,
    args: Vec<String>,
) -> Result<RunSummary, String> {
    let cancel = Arc::new(AtomicBool::new(false));
    runs.0
        .lock()
        .map_err(|_| "FFmpeg run state is unavailable".to_string())?
        .insert(run_id.clone(), cancel.clone());
    let runs = runs.inner().clone();
    let worker_run_id = run_id.clone();
    let result = tauri::async_runtime::spawn_blocking(move || {
        run_sync(app, worker_run_id, engine_path, args, cancel)
    })
    .await
    .map_err(|e| format!("FFmpeg worker failed: {e}"));
    if let Ok(mut active) = runs.0.lock() {
        active.remove(&run_id);
    }
    result?
}

#[tauri::command]
pub fn cancel_ffmpeg(runs: State<'_, EngineRuns>, run_id: String) -> bool {
    if let Ok(active) = runs.0.lock() {
        if let Some(cancel) = active.get(&run_id) {
            cancel.store(true, Ordering::SeqCst);
            return true;
        }
    }
    false
}
