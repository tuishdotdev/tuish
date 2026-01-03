use super::{load_config, print_placeholder, require_api_key, CliResult, Context};

pub fn list(ctx: &Context) -> CliResult {
	ensure_auth(ctx)?;
	print_placeholder(ctx, "Customers", "Listing customers will be added once the API is available.")?;
	Ok(())
}

pub fn view(ctx: &Context, _id: String) -> CliResult {
	ensure_auth(ctx)?;
	print_placeholder(ctx, "Customer details", "Customer lookup will be added once the API is available.")?;
	Ok(())
}

pub fn revoke(ctx: &Context, _id: String) -> CliResult {
	ensure_auth(ctx)?;
	print_placeholder(ctx, "Revoke license", "License revocation will be added once the API is available.")?;
	Ok(())
}

fn ensure_auth(ctx: &Context) -> CliResult {
	let config = load_config(&ctx.config_path)?;
	require_api_key(&config)?;
	Ok(())
}
