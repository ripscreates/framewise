mod engine;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(engine::EngineRuns::default())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            engine::detect_ffmpeg_engines,
            engine::probe_ffmpeg,
            engine::list_media_files,
            engine::default_output_directory,
            engine::run_ffmpeg,
            engine::cancel_ffmpeg
        ])
        .run(tauri::generate_context!())
        .expect("Framewise desktop app could not start");
}
