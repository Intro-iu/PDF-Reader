use serde::{Deserialize, Serialize};
use std::fs::File;
use std::io::{Read, Write};
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

// AI模型配置
// 使用 serde(rename_all = "camelCase") 来自动转换字段名
#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct AiModel {
    id: String,
    name: String,
    model_id: String,
    api_endpoint: String,
    api_key: String,
    supports_chat: bool,
    supports_translation: bool,
}

// 完整的应用配置结构
#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct AppConfig {
    ai_models: Vec<AiModel>,
    active_chat_model: String,
    active_translate_model: String,
    translate_target_lang: String,
    auto_save_settings: bool,
    enable_selection_translation: bool,
    text_selection_color: String,
    selection_opacity: u32,
    chat_prompt: String,
    translation_prompt: String,
}

// 为 AppConfig 提供默认值
impl Default for AppConfig {
    fn default() -> Self {
        Self {
            ai_models: vec![],
            active_chat_model: "".to_string(),
            active_translate_model: "".to_string(),
            translate_target_lang: "zh".to_string(),
            auto_save_settings: true,
            enable_selection_translation: true,
            text_selection_color: "#007bff".to_string(),
            selection_opacity: 30,
            chat_prompt: "你是一个专业的学术论文阅读助手。".to_string(),
            translation_prompt: "Translate the following text to [TARGET_LANG]: [SELECTED_TEXT]"
                .to_string(),
        }
    }
}

// 获取配置文件路径
fn get_config_path(app_handle: &AppHandle) -> PathBuf {
    // 在开发模式下，我们将配置文件放在项目根目录
    // 在生产模式下，我们将其放在可执行文件旁边
    if cfg!(debug_assertions) {
        // `resource_dir` 在开发时指向 `src-tauri/target/debug` 或 `src-tauri/target/release`
        // 我们需要向上追溯到项目根目录
        app_handle
            .path()
            .resource_dir()
            .unwrap()
            .parent() // -> target
            .unwrap()
            .parent() // -> src-tauri
            .unwrap()
            .parent() // -> project root
            .unwrap()
            .join("config.json")
    } else {
        // 在生产环境中，获取可执行文件所在的目录
        let exe_path = std::env::current_exe().expect("Failed to get executable path");
        let exe_dir = exe_path.parent().expect("Failed to get executable directory");
        exe_dir.join("config.json")
    }
}

// 从 config.json 读取配置
fn read_config(app_handle: &AppHandle) -> AppConfig {
    let config_path = get_config_path(app_handle);
    if !config_path.exists() {
        let default_config = AppConfig::default();
        // 如果文件不存在，创建一个带有默认配置的文件
        if write_config(app_handle, default_config.clone()).is_ok() {
            return default_config;
        }
        return AppConfig::default();
    }

    let mut file = match File::open(config_path) {
        Ok(file) => file,
        Err(_) => return AppConfig::default(),
    };

    let mut contents = String::new();
    if file.read_to_string(&mut contents).is_err() {
        return AppConfig::default();
    }

    // 如果解析失败，返回默认配置
    serde_json::from_str(&contents).unwrap_or_else(|_| AppConfig::default())
}

// 将配置写入 config.json
fn write_config(app_handle: &AppHandle, config: AppConfig) -> Result<(), std::io::Error> {
    let config_path = get_config_path(app_handle);
    let json_string =
        serde_json::to_string_pretty(&config).expect("Failed to serialize config to JSON");

    let mut file =
        File::create(config_path).expect("Failed to create or open config file for writing");
    file.write_all(json_string.as_bytes())
}

// Tauri 命令：获取配置
#[tauri::command]
pub fn get_config(app_handle: AppHandle) -> AppConfig {
    read_config(&app_handle)
}

// Tauri 命令：保存配置
#[tauri::command]
pub fn set_config(app_handle: AppHandle, config: AppConfig) {
    if write_config(&app_handle, config).is_err() {
        // 在实际应用中可能需要更好的错误处理
        eprintln!("Failed to write config");
    }
}