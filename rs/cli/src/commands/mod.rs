use colored::Colorize;
use serde::{Deserialize, Serialize};
use std::error::Error;
use std::fs;
use std::path::{Path, PathBuf};

pub mod analytics;
pub mod customers;
pub mod demo;
pub mod keys;
pub mod login;
pub mod logout;
pub mod products;

pub type CliResult<T = ()> = Result<T, Box<dyn Error>>;

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct Config {
	pub api_key: Option<String>,
	pub api_base_url: Option<String>,
}

#[derive(Debug, Clone)]
pub struct Context {
	pub config_path: PathBuf,
	pub api_url: Option<String>,
	pub json: bool,
}

impl Context {
	pub fn new(config_path: PathBuf, api_url: Option<String>, json: bool) -> Self {
		Self {
			config_path,
			api_url,
			json,
		}
	}
}

pub fn resolve_config_path(cli_path: Option<PathBuf>) -> CliResult<PathBuf> {
	if let Some(path) = cli_path {
		return Ok(path);
	}
	if let Ok(env_path) = std::env::var("TUISH_CONFIG") {
		if !env_path.trim().is_empty() {
			return Ok(PathBuf::from(env_path));
		}
	}
	let home = dirs::home_dir().ok_or("unable to resolve home directory")?;
	Ok(home.join(".tuish").join("config.json"))
}

pub fn load_config(path: &Path) -> CliResult<Config> {
	if !path.exists() {
		return Ok(Config::default());
	}
	let data = fs::read_to_string(path)?;
	let config = serde_json::from_str(&data)?;
	Ok(config)
}

pub fn save_config(path: &Path, config: &Config) -> CliResult {
	if let Some(parent) = path.parent() {
		fs::create_dir_all(parent)?;
	}
	let data = serde_json::to_string_pretty(config)?;
	fs::write(path, data)?;
	Ok(())
}

pub fn delete_config(path: &Path) -> CliResult {
	if path.exists() {
		fs::remove_file(path)?;
	}
	Ok(())
}

pub fn require_api_key(config: &Config) -> CliResult<&str> {
	config
		.api_key
		.as_deref()
		.ok_or_else(|| "No API key found; run tuish login".into())
}

pub fn output_json<T: Serialize>(value: &T) -> CliResult {
	let data = serde_json::to_string_pretty(value)?;
	println!("{data}");
	Ok(())
}

pub fn print_json_error(err: &dyn Error) {
	let payload = serde_json::json!({ "error": err.to_string() });
	if let Ok(data) = serde_json::to_string_pretty(&payload) {
		eprintln!("{data}");
	} else {
		eprintln!("{{\"error\":\"{}\"}}", err);
	}
}

pub fn print_placeholder(ctx: &Context, title: &str, detail: &str) -> CliResult {
	if ctx.json {
		let payload = serde_json::json!({
			"status": "not_implemented",
			"title": title,
			"message": detail,
		});
		return output_json(&payload);
	}

	println!("{}", title.bold());
	println!("{}", "Not implemented yet".yellow());
	if !detail.is_empty() {
		println!("{}", detail.dimmed());
	}
	Ok(())
}
