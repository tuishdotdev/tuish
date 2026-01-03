mod commands;

use clap::{Parser, Subcommand};
use std::path::PathBuf;

#[derive(Parser)]
#[command(name = "tuish", version, about = "Tuish developer CLI")]
struct Cli {
	/// Path to the config file
	#[arg(long, global = true)]
	config: Option<PathBuf>,

	/// Override the API base URL
	#[arg(long, global = true)]
	api_url: Option<String>,

	/// Output JSON (headless mode for scripting)
	#[arg(long, short = 'j', global = true)]
	json: bool,

	#[command(subcommand)]
	command: Command,
}

#[derive(Subcommand)]
enum Command {
	Login {
		/// API key to store
		#[arg(long)]
		api_key: Option<String>,
	},
	Logout,
	Products {
		#[command(subcommand)]
		command: Option<ProductCommand>,
	},
	Customers {
		#[command(subcommand)]
		command: Option<CustomerCommand>,
	},
	Keys,
	Analytics {
		/// Time window (e.g. 7d, 30d)
		#[arg(long)]
		period: Option<String>,
	},
	Demo,
}

#[derive(Subcommand)]
enum ProductCommand {
	List,
	Create,
	Update { id: String },
	Delete { id: String },
}

#[derive(Subcommand)]
enum CustomerCommand {
	List,
	View { id: String },
	Revoke { id: String },
}

#[tokio::main]
async fn main() {
	let cli = Cli::parse();
	let json = cli.json;
	if let Err(err) = run(cli).await {
		if json {
			commands::print_json_error(err.as_ref());
		} else {
			eprintln!("{err}");
		}
		std::process::exit(1);
	}
}

async fn run(cli: Cli) -> commands::CliResult {
	let config_path = commands::resolve_config_path(cli.config)?;
	let context = commands::Context::new(config_path, cli.api_url, cli.json);

	match cli.command {
		Command::Login { api_key } => commands::login::run(&context, api_key),
		Command::Logout => commands::logout::run(&context),
		Command::Products { command } => match command.unwrap_or(ProductCommand::List) {
			ProductCommand::List => commands::products::list(&context),
			ProductCommand::Create => commands::products::create(&context),
			ProductCommand::Update { id } => commands::products::update(&context, id),
			ProductCommand::Delete { id } => commands::products::delete(&context, id),
		},
		Command::Customers { command } => match command.unwrap_or(CustomerCommand::List) {
			CustomerCommand::List => commands::customers::list(&context),
			CustomerCommand::View { id } => commands::customers::view(&context, id),
			CustomerCommand::Revoke { id } => commands::customers::revoke(&context, id),
		},
		Command::Keys => commands::keys::run(&context),
		Command::Analytics { period } => commands::analytics::run(&context, period),
		Command::Demo => commands::demo::run(&context),
	}
}
