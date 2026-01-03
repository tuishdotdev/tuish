use super::{output_json, CliResult, Context};
use colored::Colorize;
use serde_json;

pub fn run(ctx: &Context) -> CliResult {
	if ctx.json {
		let payload = serde_json::json!({
			"status": "not_implemented",
			"title": "Tuish demo",
			"message": "Interactive purchase flow demo will be added soon.",
		});
		return output_json(&payload);
	}
	println!("{}", "Tuish demo".bold());
	println!("{}", "Interactive purchase flow demo will be added soon.".yellow());
	Ok(())
}
