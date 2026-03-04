use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;

use crate::app_config::AppType;
use crate::codex_config::{get_codex_auth_path, get_codex_config_path};
use crate::error::AppError;
use crate::gemini_config::{get_gemini_env_path, get_gemini_settings_path};
use crate::openclaw_config::get_openclaw_config_path;
use crate::opencode_config::get_opencode_config_path;
use crate::store::AppState;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct FileSnapshot {
    path: String,
    existed: bool,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    content: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct AppBackup {
    files: Vec<FileSnapshot>,
    backed_up_at: String,
}

#[derive(Debug, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct TakeoverBackupStore {
    #[serde(default)]
    apps: HashMap<String, AppBackup>,
}

fn backup_store_path() -> PathBuf {
    crate::config::get_app_config_dir()
        .join("takeover")
        .join("live-backups.json")
}

fn load_backup_store() -> Result<TakeoverBackupStore, AppError> {
    let path = backup_store_path();
    if !path.exists() {
        return Ok(TakeoverBackupStore::default());
    }
    let raw = fs::read_to_string(&path).map_err(|e| AppError::io(&path, e))?;
    serde_json::from_str::<TakeoverBackupStore>(&raw).map_err(|e| AppError::json(&path, e))
}

fn save_backup_store(store: &TakeoverBackupStore) -> Result<(), AppError> {
    let path = backup_store_path();
    if store.apps.is_empty() {
        if path.exists() {
            fs::remove_file(&path).map_err(|e| AppError::io(&path, e))?;
        }
        return Ok(());
    }
    crate::config::write_json_file(&path, store)
}

fn target_paths_for_app(app_type: &AppType) -> Vec<PathBuf> {
    match app_type {
        AppType::Claude => vec![crate::config::get_claude_settings_path()],
        AppType::Codex => vec![get_codex_auth_path(), get_codex_config_path()],
        AppType::Gemini => vec![get_gemini_env_path(), get_gemini_settings_path()],
        AppType::OpenCode => vec![get_opencode_config_path()],
        AppType::OpenClaw => vec![get_openclaw_config_path()],
    }
}

/// Ensure backup exists before writing live config for this app.
pub fn ensure_backup_before_takeover(app_type: &AppType) -> Result<(), AppError> {
    let key = app_type.as_str().to_string();
    let mut store = load_backup_store()?;
    if store.apps.contains_key(&key) {
        return Ok(());
    }

    let files = target_paths_for_app(app_type)
        .into_iter()
        .map(|path| {
            if path.exists() {
                let raw = fs::read_to_string(&path).map_err(|e| AppError::io(&path, e))?;
                Ok(FileSnapshot {
                    path: path.to_string_lossy().to_string(),
                    existed: true,
                    content: Some(raw),
                })
            } else {
                Ok(FileSnapshot {
                    path: path.to_string_lossy().to_string(),
                    existed: false,
                    content: None,
                })
            }
        })
        .collect::<Result<Vec<_>, AppError>>()?;

    let backup = AppBackup {
        files,
        backed_up_at: chrono::Utc::now().to_rfc3339(),
    };
    store.apps.insert(key, backup);
    save_backup_store(&store)?;
    Ok(())
}

/// Restore original live config for one app and clear its backup snapshot.
///
/// Returns true when an existing backup was found and restored.
pub fn restore_original_config_for_app(app_type: &AppType) -> Result<bool, AppError> {
    let key = app_type.as_str().to_string();
    let mut store = load_backup_store()?;
    let Some(backup) = store.apps.remove(&key) else {
        return Ok(false);
    };

    for file in backup.files {
        let path = PathBuf::from(&file.path);
        if file.existed {
            let content = file.content.as_deref().unwrap_or_default();
            crate::config::write_text_file(&path, content)?;
        } else if path.exists() {
            fs::remove_file(&path).map_err(|e| AppError::io(&path, e))?;
        }
    }

    save_backup_store(&store)?;
    Ok(true)
}

/// Apply current provider configuration to one app.
///
/// For additive-mode apps, syncs all providers.
/// For switch-mode apps, syncs only effective current provider.
pub fn apply_current_provider_to_live(state: &AppState, app_type: &AppType) -> Result<(), AppError> {
    let providers = state.db.get_all_providers(app_type.as_str())?;

    if app_type.is_additive_mode() {
        for provider in providers.values() {
            crate::services::provider::write_live_snapshot(app_type, provider)?;
        }
        return Ok(());
    }

    let current_id = crate::settings::get_effective_current_provider(&state.db, app_type)?;
    let Some(current_id) = current_id else {
        return Ok(());
    };

    if let Some(provider) = providers.get(&current_id) {
        crate::services::provider::write_live_snapshot(app_type, provider)?;
    }

    Ok(())
}

/// On startup, restore original configs for apps whose takeover is disabled.
pub fn restore_disabled_takeovers_on_startup() -> Result<(), AppError> {
    for app_type in AppType::all() {
        if !crate::settings::is_app_takeover_enabled(&app_type) {
            let _ = restore_original_config_for_app(&app_type)?;
        }
    }
    Ok(())
}

/// On startup, ensure enabled apps have an initial backup snapshot.
pub fn ensure_enabled_takeover_backups_on_startup() -> Result<(), AppError> {
    for app_type in AppType::all() {
        if crate::settings::is_app_takeover_enabled(&app_type) {
            ensure_backup_before_takeover(&app_type)?;
        }
    }
    Ok(())
}
