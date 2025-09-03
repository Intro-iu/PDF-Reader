use serde::{Deserialize, Serialize};
use std::fs::File;
use std::io::{Read, Write};
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

// PDF 历史记录项
#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct PdfHistoryItem {
    id: String,
    name: String,
    path: String,
    open_time: u64,
    total_pages: Option<u32>,
}

// PDF 历史记录数据结构
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PdfHistoryData {
    items: Vec<PdfHistoryItem>,
}

impl Default for PdfHistoryData {
    fn default() -> Self {
        Self { items: vec![] }
    }
}

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

// 获取PDF历史记录文件路径
fn get_pdf_history_path(app_handle: &AppHandle) -> PathBuf {
    if cfg!(debug_assertions) {
        app_handle
            .path()
            .resource_dir()
            .unwrap()
            .parent()
            .unwrap()
            .parent()
            .unwrap()
            .parent()
            .unwrap()
            .join("pdf-history.json")
    } else {
        let exe_path = std::env::current_exe().expect("Failed to get executable path");
        let exe_dir = exe_path.parent().expect("Failed to get executable directory");
        exe_dir.join("pdf-history.json")
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

// 从 config.json 读取配置，如果不存在则创建默认配置
fn read_config(app_handle: &AppHandle) -> AppConfig {
    let config_path = get_config_path(app_handle);
    
    if !config_path.exists() {
        // 如果文件不存在，创建默认配置并保存
        let default_config = AppConfig::default();
        if let Err(e) = write_config(app_handle, default_config.clone()) {
            eprintln!("Failed to create default config file: {}", e);
        } else {
            println!("Created default config file at: {:?}", config_path);
        }
        return default_config;
    }

    let mut file = match File::open(&config_path) {
        Ok(file) => file,
        Err(e) => {
            eprintln!("Failed to open config file: {}", e);
            return AppConfig::default();
        },
    };

    let mut contents = String::new();
    if let Err(e) = file.read_to_string(&mut contents) {
        eprintln!("Failed to read config file: {}", e);
        return AppConfig::default();
    }

    // 如果解析失败，返回默认配置
    serde_json::from_str(&contents).unwrap_or_else(|_| AppConfig::default())
}

// 将配置写入 config.json，确保目录存在
fn write_config(app_handle: &AppHandle, config: AppConfig) -> Result<(), std::io::Error> {
    let config_path = get_config_path(app_handle);
    
    // 确保父目录存在
    if let Some(parent_dir) = config_path.parent() {
        if !parent_dir.exists() {
            std::fs::create_dir_all(parent_dir)?;
        }
    }
    
    let json_string = serde_json::to_string_pretty(&config)
        .map_err(|e| std::io::Error::new(std::io::ErrorKind::InvalidData, e))?;

    let mut file = File::create(&config_path)?;
    file.write_all(json_string.as_bytes())?;
    
    println!("Config saved to: {:?}", config_path);
    Ok(())
}

// Tauri 命令：获取配置
#[tauri::command]
pub fn get_config(app_handle: AppHandle) -> AppConfig {
    read_config(&app_handle)
}

// Tauri 命令：检查配置文件是否存在
#[tauri::command]
pub fn config_file_exists(app_handle: AppHandle) -> bool {
    let config_path = get_config_path(&app_handle);
    config_path.exists()
}

// Tauri 命令：保存配置，确保文件能被创建
#[tauri::command]
pub fn set_config(app_handle: AppHandle, config: AppConfig) -> Result<(), String> {
    write_config(&app_handle, config)
        .map_err(|e| format!("Failed to write config: {}", e))
}

// Tauri 命令：初始化配置（确保配置文件存在）
#[tauri::command]
pub fn init_config(app_handle: AppHandle) -> AppConfig {
    let config = read_config(&app_handle);
    // read_config 已经会在文件不存在时自动创建
    config
}

// Tauri 命令：从指定文件导入配置
#[tauri::command]
pub fn import_config_from_file(app_handle: AppHandle, file_path: String) -> Result<AppConfig, String> {
    let path = PathBuf::from(file_path);
    
    if !path.exists() {
        return Err("配置文件不存在".to_string());
    }

    let mut file = File::open(&path)
        .map_err(|e| format!("无法打开配置文件: {}", e))?;

    let mut contents = String::new();
    file.read_to_string(&mut contents)
        .map_err(|e| format!("无法读取配置文件: {}", e))?;

    let imported_config: AppConfig = serde_json::from_str(&contents)
        .map_err(|e| format!("配置文件格式错误: {}", e))?;

    // 保存导入的配置到应用的配置文件
    if let Err(e) = write_config(&app_handle, imported_config.clone()) {
        return Err(format!("保存配置失败: {}", e));
    }

    Ok(imported_config)
}

// Tauri 命令：导出配置到指定文件
#[tauri::command]
pub fn export_config_to_file(_app_handle: AppHandle, file_path: String, config: AppConfig) -> Result<(), String> {
    let path = PathBuf::from(file_path);
    
    // 确保目录存在
    if let Some(parent_dir) = path.parent() {
        if !parent_dir.exists() {
            std::fs::create_dir_all(parent_dir)
                .map_err(|e| format!("无法创建目录: {}", e))?;
        }
    }

    let json_string = serde_json::to_string_pretty(&config)
        .map_err(|e| format!("序列化配置失败: {}", e))?;

    let mut file = File::create(&path)
        .map_err(|e| format!("无法创建文件: {}", e))?;

    file.write_all(json_string.as_bytes())
        .map_err(|e| format!("写入文件失败: {}", e))?;

    println!("配置已导出到: {:?}", path);
    Ok(())
}

// PDF 历史记录相关函数
fn read_pdf_history(app_handle: &AppHandle) -> PdfHistoryData {
    let history_path = get_pdf_history_path(app_handle);
    
    if !history_path.exists() {
        let default_history = PdfHistoryData::default();
        if let Err(e) = write_pdf_history(app_handle, default_history.clone()) {
            eprintln!("Failed to create default PDF history file: {}", e);
        } else {
            println!("Created default PDF history file at: {:?}", history_path);
        }
        return default_history;
    }

    let mut file = match File::open(&history_path) {
        Ok(file) => file,
        Err(e) => {
            eprintln!("Failed to open PDF history file: {}", e);
            return PdfHistoryData::default();
        },
    };

    let mut contents = String::new();
    if let Err(e) = file.read_to_string(&mut contents) {
        eprintln!("Failed to read PDF history file: {}", e);
        return PdfHistoryData::default();
    }

    serde_json::from_str(&contents).unwrap_or_else(|_| PdfHistoryData::default())
}

fn write_pdf_history(app_handle: &AppHandle, history: PdfHistoryData) -> Result<(), std::io::Error> {
    let history_path = get_pdf_history_path(app_handle);
    
    if let Some(parent_dir) = history_path.parent() {
        if !parent_dir.exists() {
            std::fs::create_dir_all(parent_dir)?;
        }
    }
    
    let json_string = serde_json::to_string_pretty(&history)
        .map_err(|e| std::io::Error::new(std::io::ErrorKind::InvalidData, e))?;

    let mut file = File::create(&history_path)?;
    file.write_all(json_string.as_bytes())?;
    
    println!("PDF history saved to: {:?}", history_path);
    Ok(())
}

// Tauri 命令：获取PDF历史记录
#[tauri::command]
pub fn get_pdf_history(app_handle: AppHandle) -> PdfHistoryData {
    read_pdf_history(&app_handle)
}

// Tauri 命令：保存PDF历史记录
#[tauri::command]
pub fn set_pdf_history(app_handle: AppHandle, history: PdfHistoryData) -> Result<(), String> {
    write_pdf_history(&app_handle, history)
        .map_err(|e| format!("Failed to write PDF history: {}", e))
}

// Tauri 命令：初始化PDF历史记录
#[tauri::command]
pub fn init_pdf_history(app_handle: AppHandle) -> PdfHistoryData {
    read_pdf_history(&app_handle)
}