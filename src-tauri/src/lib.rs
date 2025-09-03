mod config;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_fs::init())
    .plugin(tauri_plugin_dialog::init())
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .invoke_handler(tauri::generate_handler![
      config::get_config,
      config::set_config,
      config::config_file_exists,
      config::init_config,
      config::get_pdf_history,
      config::set_pdf_history,
      config::init_pdf_history
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}

