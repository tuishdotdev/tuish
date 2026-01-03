use super::{load_config, print_placeholder, require_api_key, CliResult, Context};
use serde_json;

pub fn run(ctx: &Context, period: Option<String>) -> CliResult {
	let config = load_config(&ctx.config_path)?;
	require_api_key(&config)?;

	if let Some(period) = period {
		if ctx.json {
			let payload = serde_json::json!({
				"status": "not_implemented",
				"title": "Analytics",
				"message": "Analytics will be added once the API is available.",
				"period": period,
			});
			return super::output_json(&payload);
		}
		print_placeholder(ctx, "Analytics", &format!("Period: {period}"))?;
		return Ok(());
	}
	print_placeholder(ctx, "Analytics", "Analytics will be added once the API is available.")?;
	Ok(())
}
