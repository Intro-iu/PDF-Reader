use serde::{Deserialize, Serialize};
use std::fs::File;
use std::io::{Read, Write};
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

// PDF历史记录项
#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct PdfHistoryItem {
    pub id: String,
    pub name: String,
    pub path: String,
    pub open_time: u64,
    pub total_pages: Option<u32>,
}

// PDF历史记录列表
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PdfHistory {
    pub items: Vec<PdfHistoryItem>,
}

impl Default for PdfHistory {
    fn default() -> Self {
        Self {
            items: Vec::new(),
        }
    }
}

// 获取PDF历史记录文件路径
fn get_history_path(app_handle: &AppHandle) -> PathBuf {
    // 使用与config.json相同的路径逻辑
    if cfg!(debug_assertions) {
        // 开发模式下，放在项目根目录
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
            .join("pdf-history.json")
    } else {
        // 生产环境中，获取可执行文件所在的目录
        let exe_path = std::env::current_exe().expect("Failed to get executable path");
        let exe_dir = exe_path.parent().expect("Failed to get executable directory");
        exe_dir.join("pdf-history.json")
    }
}

// 从 pdf-history.json 读取历史记录
fn read_history(app_handle: &AppHandle) -> PdfHistory {
    let history_path = get_history_path(app_handle);
    if !history_path.exists() {
        // 如果文件不存在，返回空的历史记录
        return PdfHistory::default();
    }

    let mut file = match File::open(history_path) {
        Ok(file) => file,
        Err(_) => return PdfHistory::default(),
    };

    let mut contents = String::new();
    if file.read_to_string(&mut contents).is_err() {
        return PdfHistory::default();
    }

    // 如果解析失败，返回空的历史记录
    serde_json::from_str(&contents).unwrap_or_else(|_| PdfHistory::default())
}

// 将历史记录写入 pdf-history.json
fn write_history(app_handle: &AppHandle, history: PdfHistory) -> Result<(), std::io::Error> {
    let history_path = get_history_path(app_handle);
    let json_string = serde_json::to_string_pretty(&history)
        .expect("Failed to serialize history to JSON");

    let mut file = File::create(history_path)
        .expect("Failed to create or open history file for writing");
    file.write_all(json_string.as_bytes())
}

// Tauri 命令：获取PDF历史记录
#[tauri::command]
pub fn get_pdf_history(app_handle: AppHandle) -> PdfHistory {
    read_history(&app_handle)
}

// Tauri 命令：检查PDF历史记录文件是否存在
#[tauri::command]
pub fn pdf_history_file_exists(app_handle: AppHandle) -> bool {
    let history_path = get_history_path(&app_handle);
    history_path.exists()
}

// Tauri 命令：保存PDF历史记录
#[tauri::command]
pub fn set_pdf_history(app_handle: AppHandle, history: PdfHistory) {
    if write_history(&app_handle, history).is_err() {
        eprintln!("Failed to write PDF history");
    }
}

// Tauri 命令：添加单个PDF到历史记录
#[tauri::command]
pub fn add_pdf_to_history(
    app_handle: AppHandle, 
    item: PdfHistoryItem
) -> Result<(), String> {
    let mut history = read_history(&app_handle);
    
    // 检查是否已存在（基于文件路径）
    if let Some(existing_index) = history.items.iter().position(|h| h.path == item.path) {
        // 如果已存在，更新时间并移到最前
        history.items.remove(existing_index);
    }
    
    // 添加到开头
    history.items.insert(0, item);
    
    // 限制历史记录数量为50
    if history.items.len() > 50 {
        history.items.truncate(50);
    }
    
    // 保存
    write_history(&app_handle, history)
        .map_err(|e| format!("Failed to save history: {}", e))
}
