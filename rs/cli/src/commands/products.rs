use super::{load_config, print_placeholder, require_api_key, CliResult, Context};

pub fn list(ctx: &Context) -> CliResult {
	ensure_auth(ctx)?;
	print_placeholder(ctx, "Products", "Listing products will be added once the API is available.")?;
	Ok(())
}

pub fn create(ctx: &Context) -> CliResult {
	ensure_auth(ctx)?;
	print_placeholder(ctx, "Create product", "Interactive creation will be added once the API is available.")?;
	Ok(())
}

pub fn update(ctx: &Context, _id: String) -> CliResult {
	ensure_auth(ctx)?;
	print_placeholder(ctx, "Update product", "Updates will be added once the API is available.")?;
	Ok(())
}

pub fn delete(ctx: &Context, _id: String) -> CliResult {
	ensure_auth(ctx)?;
	print_placeholder(ctx, "Delete product", "Deletion will be added once the API is available.")?;
	Ok(())
}

fn ensure_auth(ctx: &Context) -> CliResult {
	let config = load_config(&ctx.config_path)?;
	require_api_key(&config)?;
	Ok(())
}
