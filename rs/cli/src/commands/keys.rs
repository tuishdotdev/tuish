use super::{load_config, output_json, require_api_key, CliResult, Context};
use colored::Colorize;
use serde_json;

pub fn run(ctx: &Context) -> CliResult {
	let config = load_config(&ctx.config_path)?;
	let api_key = require_api_key(&config)?;

	if ctx.json {
		let payload = serde_json::json!({
			"apiKey": api_key,
			"apiBaseUrl": config.api_base_url,
		});
		return output_json(&payload);
	}

	println!("{}", "API Key".bold());
	println!("{api_key}");

	if let Some(url) = config.api_base_url {
		println!();
		println!("{}", "API Base URL".bold());
		println!("{url}");
	}
	Ok(())
}
