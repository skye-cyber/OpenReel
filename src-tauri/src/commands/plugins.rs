use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone)]
pub struct RepositoryPermissionId(pub String);

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct RepositoryPlugin {
    pub id: String,
    pub name: String,
    pub provider: String,
    pub version: String,
    pub category: String,
    pub description: String,
    pub long_description: Option<String>,
    pub homepage: Option<String>,
    pub permissions: Vec<String>,
    pub api_version: String,
    pub hooks: Option<Vec<String>>,
    pub size: Option<String>,
    pub signed: bool,
    pub compatibility: Compatibility,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct Compatibility {
    pub ok: bool,
    pub reason: Option<String>,
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Repository {
    pub id: String,
    pub label: String,
    pub url: String,
    pub last_fetched_at: Option<u64>,
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RepositoryCatalog {
    pub repository: Repository,
    pub plugins: Vec<RepositoryPlugin>,
    pub fetched_at: u64,
}

#[tauri::command]
pub async fn fetch_repository(
    repository: Repository,
) -> Result<RepositoryCatalog, String> {
    log::info!(
        "Fetching repository: {} ({})",
               repository.label,
               repository.url
    );

    let response = reqwest::get(&repository.url)
    .await
    .map_err(|e| format!("fetch: {e}"))?
    .error_for_status()
    .map_err(|e| format!("HTTP: {e}"))?;

    let plugins: Vec<RepositoryPlugin> = response
    .json()
    .await
    .map_err(|e| format!("parse: {e}"))?;

    let now = std::time::SystemTime::now()
    .duration_since(std::time::UNIX_EPOCH)
    .map(|d| d.as_millis() as u64)
    .unwrap_or(0);

    let catalog = RepositoryCatalog {
        repository: Repository {
            last_fetched_at: Some(now),
            ..repository
        },
        plugins,
        fetched_at: now,
    };

    log::info!(
        "Repository fetched: {} plugins",
        catalog.plugins.len()
    );

    Ok(catalog)
}
