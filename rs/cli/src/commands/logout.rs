use super::{delete_config, output_json, CliResult, Context};
use colored::Colorize;
use serde_json;

pub fn run(ctx: &Context) -> CliResult {
	delete_config(&ctx.config_path)?;
	if ctx.json {
		let payload = serde_json::json!({
			"success": true,
			"message": "Logged out successfully",
		});
		return output_json(&payload);
	}
	println!("{}", "Credentials cleared.".green());
	println!("{}", format!("Config: {}", ctx.config_path.display()).dimmed());
	Ok(())
}
