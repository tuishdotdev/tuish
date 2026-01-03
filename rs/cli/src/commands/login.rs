use super::{load_config, output_json, save_config, CliResult, Context};
use colored::Colorize;
use serde_json;
use std::io::{self, Write};

const DEFAULT_API_BASE_URL: &str = "https://api.tuish.dev";

pub fn run(ctx: &Context, api_key: Option<String>) -> CliResult {
	let mut config = load_config(&ctx.config_path)?;
	let mut key = api_key.unwrap_or_default();

	if key.trim().is_empty() && ctx.json {
		return Err("API key is required".into());
	}
	if key.trim().is_empty() {
		print!("Enter your Tuish API key: ");
		io::stdout().flush()?;
		let mut input = String::new();
		io::stdin().read_line(&mut input)?;
		key = input.trim().to_string();
	}

	if key.is_empty() {
		return Err("api key is required".into());
	}

	config.api_key = Some(key);
	if let Some(url) = &ctx.api_url {
		config.api_base_url = Some(url.clone());
	} else if config.api_base_url.is_none() {
		config.api_base_url = Some(DEFAULT_API_BASE_URL.to_string());
	}

	save_config(&ctx.config_path, &config)?;

	if ctx.json {
		let payload = serde_json::json!({
			"success": true,
			"message": "API key stored successfully",
		});
		return output_json(&payload);
	}

	println!("{}", "Saved credentials.".green());
	println!("{}", format!("Config: {}", ctx.config_path.display()).dimmed());
	Ok(())
}
