use serde::Deserialize;
use serde_json::Value;
use std::path::PathBuf;
use std::process::Command;

#[derive(Deserialize)]
struct CliVectors {
	cases: Vec<CliCase>,
}

#[derive(Deserialize)]
struct CliCase {
	name: String,
	args: Vec<String>,
	expect: CliExpect,
}

#[derive(Deserialize)]
struct CliExpect {
	exit_code: i32,
	stdout: Option<Value>,
	stderr: Option<Value>,
}

#[test]
fn spec_cli_vectors() -> Result<(), Box<dyn std::error::Error>> {
	let manifest_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
	let vectors_path = manifest_dir.join("../../spec/tests/vectors/cli.json");
	let data = std::fs::read_to_string(vectors_path)?;
	let vectors: CliVectors = serde_json::from_str(&data)?;

	let bin = build_cli_bin()?;

	for case in vectors.cases {
		let temp_dir = tempfile::tempdir()?;
		let config_path = temp_dir.path().join("config.json");

		let output = Command::new(&bin)
			.arg("--config")
			.arg(&config_path)
			.arg("--json")
			.args(&case.args)
			.output()?;

		let exit_code = output.status.code().unwrap_or(1);
		assert_eq!(
			exit_code, case.expect.exit_code,
			"case {}: exit code",
			case.name
		);

		if let Some(expected) = case.expect.stdout {
			let actual: Value = serde_json::from_slice(&output.stdout)?;
			assert_eq!(actual, expected, "case {}: stdout", case.name);
		}

		if let Some(expected) = case.expect.stderr {
			let actual: Value = serde_json::from_slice(&output.stderr)?;
			assert_eq!(actual, expected, "case {}: stderr", case.name);
		}
	}
	Ok(())
}

fn build_cli_bin() -> Result<PathBuf, Box<dyn std::error::Error>> {
	let manifest_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
	let status = Command::new("cargo")
		.args(["build", "--quiet", "--bin", "tuish-cli"])
		.current_dir(&manifest_dir)
		.status()?;
	if !status.success() {
		return Err("cargo build failed".into());
	}
	let bin_name = if cfg!(windows) {
		"tuish-cli.exe"
	} else {
		"tuish-cli"
	};
	Ok(manifest_dir.join("target").join("debug").join(bin_name))
}
