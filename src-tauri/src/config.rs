use serde::{Deserialize, Serialize};
use std::fs::{self, File};
use std::io::{Read, Write};
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AppConfig {
    pub theme: String,
    pub always_on_top: bool,
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            theme: "dark".to_string(),
            always_on_top: false,
        }
    }
}

fn get_config_path(app_handle: &AppHandle) -> PathBuf {
    let config_dir = app_handle.path().app_config_dir().unwrap();
    if !config_dir.exists() {
        fs::create_dir_all(&config_dir).unwrap();
    }
    config_dir.join("config.json")
}

fn read_config(app_handle: &AppHandle) -> AppConfig {
    let config_path = get_config_path(app_handle);
    if !config_path.exists() {
        let default_config = AppConfig::default();
        write_config(app_handle, default_config.clone());
        return default_config;
    }

    let mut file = File::open(config_path).expect("Failed to open config file");
    let mut contents = String::new();
    file.read_to_string(&mut contents)
        .expect("Failed to read config file");

    serde_json::from_str(&contents).unwrap_or_else(|_| {
        AppConfig::default()
    })
}

fn write_config(app_handle: &AppHandle, config: AppConfig) {
    let config_path = get_config_path(app_handle);
    let json_string =
        serde_json::to_string_pretty(&config).expect("Failed to serialize config to JSON");

    let mut file = File::create(config_path).expect("Failed to create or open config file for writing");
    file.write_all(json_string.as_bytes())
        .expect("Failed to write config to file");
}

#[tauri::command]
pub fn get_config(app_handle: AppHandle) -> AppConfig {
    read_config(&app_handle)
}

#[tauri::command]
pub fn set_config(app_handle: AppHandle, config: AppConfig) {
    write_config(&app_handle, config);
}