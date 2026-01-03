use serde::Deserialize;
use sha2::{Digest, Sha256};
use std::fs;
use std::path::{Path, PathBuf};

use tuish::{verify_license, LicensePayload, LicenseStorage, TuishError};

#[derive(Deserialize)]
struct LicenseVectors {
    keys: LicenseKeys,
    cases: Vec<LicenseCase>,
}

#[derive(Deserialize)]
struct LicenseKeys {
    public_key_spki_base64: String,
    public_key_hex: String,
}

#[derive(Deserialize)]
struct LicenseCase {
    name: String,
    license: String,
    machine_id: String,
    expected: LicenseExpected,
}

#[derive(Deserialize)]
struct LicenseExpected {
    valid: bool,
    reason: Option<String>,
    payload: Option<LicensePayload>,
}

#[derive(Deserialize)]
struct FingerprintVectors {
    cases: Vec<FingerprintCase>,
    platform_map: Vec<MapEntry>,
    arch_map: Vec<MapEntry>,
}

#[derive(Deserialize)]
struct FingerprintCase {
    name: String,
    components: FingerprintComponents,
    expected: String,
}

#[derive(Deserialize)]
struct FingerprintComponents {
    hostname: String,
    username: String,
    platform: String,
    arch: String,
}

#[derive(Deserialize)]
struct MapEntry {
    input: String,
    expected: String,
}

#[derive(Deserialize)]
struct CacheVectors {
    product_id: String,
    expected_filename: String,
    cases: Vec<CacheCase>,
}

#[derive(Deserialize)]
struct CacheCase {
    name: String,
    cached_at: i64,
    refresh_at: i64,
    expected_needs_refresh: bool,
}

#[derive(Deserialize)]
struct FlowVectors {
    cases: Vec<FlowCase>,
}

#[derive(Deserialize)]
struct FlowCase {
    name: String,
    input: FlowInput,
    expected: FlowOutput,
}

#[derive(Deserialize)]
struct FlowInput {
    resolver: Option<FlowResolver>,
    cache: Option<FlowCache>,
}

#[derive(Deserialize)]
struct FlowResolver {
    #[serde(default)]
    enabled: bool,
    #[serde(default)]
    found: bool,
    offline: Option<FlowResult>,
    online: Option<FlowResult>,
}

#[derive(Deserialize)]
struct FlowCache {
    found: bool,
    #[serde(default)]
    fresh: bool,
    offline: Option<FlowResult>,
    online: Option<FlowResult>,
}

#[derive(Deserialize, PartialEq, Debug)]
struct FlowResult {
    valid: bool,
    reason: Option<String>,
}

#[derive(Deserialize, PartialEq, Debug)]
struct FlowFinal {
    valid: bool,
    reason: Option<String>,
    source: String,
}

#[derive(Deserialize, PartialEq, Debug)]
struct FlowOutput {
    #[serde(rename = "final")]
    final_state: FlowFinal,
    cache_actions: Vec<String>,
}

fn vectors_dir() -> PathBuf {
    let manifest_dir = Path::new(env!("CARGO_MANIFEST_DIR"));
    manifest_dir.join("../spec/tests/vectors")
}

fn read_json<T: for<'de> Deserialize<'de>>(path: &Path) -> T {
    let data = fs::read_to_string(path).expect("read spec vector");
    serde_json::from_str(&data).expect("parse spec vector")
}

fn sha256_hex(value: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(value.as_bytes());
    let result = hasher.finalize();
    result.iter().map(|b| format!("{:02x}", b)).collect()
}

fn map_platform(value: &str) -> String {
    match value {
        "macos" => "darwin".to_string(),
        "windows" => "win32".to_string(),
        other => other.to_lowercase(),
    }
}

fn map_arch(value: &str) -> String {
    match value {
        "x86_64" | "amd64" => "x64".to_string(),
        "aarch64" => "arm64".to_string(),
        "x86" | "i386" | "i686" => "ia32".to_string(),
        other => other.to_lowercase(),
    }
}

fn reason_from_error(err: &TuishError) -> &'static str {
    match err {
        TuishError::InvalidLicense(_) | TuishError::ParseError(_) => "invalid_format",
        TuishError::InvalidSignature => "invalid_signature",
        TuishError::ExpiredLicense => "expired",
        TuishError::InvalidMachineId => "machine_mismatch",
        _ => "invalid_format",
    }
}

fn evaluate_flow(input: FlowInput) -> FlowOutput {
    let mut actions: Vec<String> = Vec::new();

    if let Some(resolver) = input.resolver {
        if resolver.enabled && resolver.found {
            if let Some(offline) = resolver.offline.as_ref() {
                if offline.valid {
                    actions.push("save".to_string());
                    return FlowOutput {
                        final_state: FlowFinal {
                            valid: true,
                            reason: None,
                            source: "offline".to_string(),
                        },
                        cache_actions: actions,
                    };
                }
                if matches!(offline.reason.as_deref(), Some("expired") | Some("invalid_signature"))
                {
                    let online = resolver
                        .online
                        .unwrap_or(FlowResult { valid: false, reason: Some("network_error".to_string()) });
                    if online.valid {
                        actions.push("save".to_string());
                        return FlowOutput {
                            final_state: FlowFinal {
                                valid: true,
                                reason: None,
                                source: "online".to_string(),
                            },
                            cache_actions: actions,
                        };
                    }
                    return FlowOutput {
                        final_state: FlowFinal {
                            valid: false,
                            reason: online.reason,
                            source: "online".to_string(),
                        },
                        cache_actions: actions,
                    };
                }
            }
        }
    }

    if let Some(cache) = input.cache {
        if cache.found {
            if let Some(offline) = cache.offline.as_ref() {
                if offline.valid {
                    if cache.fresh {
                        return FlowOutput {
                            final_state: FlowFinal {
                                valid: true,
                                reason: None,
                                source: "offline".to_string(),
                            },
                            cache_actions: actions,
                        };
                    }
                    let online = cache
                        .online
                        .unwrap_or(FlowResult { valid: false, reason: Some("network_error".to_string()) });
                    if online.valid {
                        actions.push("save".to_string());
                        return FlowOutput {
                            final_state: FlowFinal {
                                valid: true,
                                reason: None,
                                source: "online".to_string(),
                            },
                            cache_actions: actions,
                        };
                    }
                    if online.reason.as_deref() == Some("network_error") {
                        return FlowOutput {
                            final_state: FlowFinal {
                                valid: true,
                                reason: None,
                                source: "offline".to_string(),
                            },
                            cache_actions: actions,
                        };
                    }
                    actions.push("remove".to_string());
                    return FlowOutput {
                        final_state: FlowFinal {
                            valid: false,
                            reason: online.reason,
                            source: "online".to_string(),
                        },
                        cache_actions: actions,
                    };
                }
                if offline.reason.as_deref() == Some("expired") {
                    let online = cache
                        .online
                        .unwrap_or(FlowResult { valid: false, reason: Some("network_error".to_string()) });
                    if !online.valid {
                        actions.push("remove".to_string());
                    }
                    return FlowOutput {
                        final_state: FlowFinal {
                            valid: online.valid,
                            reason: online.reason,
                            source: "online".to_string(),
                        },
                        cache_actions: actions,
                    };
                }
                actions.push("remove".to_string());
                return FlowOutput {
                    final_state: FlowFinal {
                        valid: false,
                        reason: offline.reason.clone(),
                        source: "offline".to_string(),
                    },
                    cache_actions: actions,
                };
            }
        }
    }

    FlowOutput {
        final_state: FlowFinal {
            valid: false,
            reason: Some("not_found".to_string()),
            source: "not_found".to_string(),
        },
        cache_actions: actions,
    }
}

#[test]
fn spec_license_vectors() {
    let vectors: LicenseVectors = read_json(&vectors_dir().join("license.json"));

    let valid_case = vectors
        .cases
        .iter()
        .find(|case| case.name == "valid_perpetual")
        .expect("valid_perpetual case");
    let payload = verify_license(
        &valid_case.license,
        &vectors.keys.public_key_spki_base64,
        Some(&valid_case.machine_id),
    )
    .expect("verify with SPKI key");
    assert_eq!(valid_case.expected.payload.as_ref().unwrap(), &payload);

    for case in vectors.cases {
        let result = verify_license(
            &case.license,
            &vectors.keys.public_key_hex,
            Some(&case.machine_id),
        );
        assert_eq!(case.expected.valid, result.is_ok(), "case {}", case.name);
        if let Some(expected_reason) = case.expected.reason.as_deref() {
            let actual_reason = result
                .as_ref()
                .err()
                .map(reason_from_error)
                .unwrap_or("valid");
            assert_eq!(expected_reason, actual_reason, "case {}", case.name);
        }
        if let Some(expected_payload) = case.expected.payload {
            let payload = result.expect("expected valid payload");
            assert_eq!(expected_payload, payload, "case {}", case.name);
        }
    }
}

#[test]
fn spec_fingerprint_vectors() {
    let vectors: FingerprintVectors = read_json(&vectors_dir().join("fingerprint.json"));

    for case in vectors.cases {
        let components = format!(
            "{}:{}:{}:{}",
            case.components.hostname,
            case.components.username,
            case.components.platform,
            case.components.arch
        );
        assert_eq!(sha256_hex(&components), case.expected, "case {}", case.name);
    }

    for entry in vectors.platform_map {
        assert_eq!(map_platform(&entry.input), entry.expected);
    }

    for entry in vectors.arch_map {
        assert_eq!(map_arch(&entry.input), entry.expected);
    }

    let runtime_components = format!(
        "{}:{}:{}:{}",
        whoami::fallible::hostname().unwrap_or_else(|_| "unknown".to_string()),
        whoami::username(),
        map_platform(std::env::consts::OS),
        map_arch(std::env::consts::ARCH)
    );
    assert_eq!(tuish::get_machine_fingerprint(), sha256_hex(&runtime_components));
}

#[test]
fn spec_cache_vectors() {
    let vectors: CacheVectors = read_json(&vectors_dir().join("cache.json"));
    let temp_dir = tempfile::tempdir().expect("temp dir");
    let storage = LicenseStorage::with_base_dir(temp_dir.path().to_path_buf());

    tokio_test::block_on(storage.save_license_key(
        &vectors.product_id,
        "license-test",
        "machine-test",
    ))
    .expect("save license");

    let entries = fs::read_dir(temp_dir.path()).expect("read dir");
    let mut found = false;
    for entry in entries {
        let entry = entry.expect("dir entry");
        if entry.file_name().to_string_lossy() == vectors.expected_filename {
            found = true;
        }
    }
    assert!(found, "expected cache file not found");

    for case in vectors.cases {
        let cached = tuish::CachedLicenseData {
            license_key: "license-test".to_string(),
            cached_at: case.cached_at,
            refresh_at: case.refresh_at,
            product_id: vectors.product_id.clone(),
            machine_fingerprint: "machine-test".to_string(),
        };
        assert_eq!(storage.needs_refresh(&cached), case.expected_needs_refresh, "case {}", case.name);
    }
}

#[test]
fn spec_flow_vectors() {
    let vectors: FlowVectors = read_json(&vectors_dir().join("license_check_flow.json"));
    for case in vectors.cases {
        let actual = evaluate_flow(case.input);
        assert_eq!(actual, case.expected, "case {}", case.name);
    }
}
