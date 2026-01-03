# Common Test Vectors

These vectors are the shared, language-neutral tests for core logic. Each SDK
should add a small test harness that reads these JSON files and asserts the
expected outputs.

## Files

- `oss/spec/tests/vectors/license.json`
  - Keys (SPKI base64, hex, PKCS8 base64, hex)
  - License strings and expected verify results
- `oss/spec/tests/vectors/cli.json`
  - CLI headless JSON vectors (login/logout/auth errors)
- `oss/spec/tests/vectors/fingerprint.json`
  - Platform/arch mapping checks
  - Fingerprint hash check
- `oss/spec/tests/vectors/cache.json`
  - Cache filename hash
  - Refresh checks using past/future timestamps
- `oss/spec/tests/vectors/license_check_flow.json`
  - Decision logic scenarios (resolver/cache/online)

## How to Use (per language)

1) License verification
   - Parse `public_key_spki_base64` and ensure it matches `public_key_hex`.
   - For each case:
     - Run verify with `license` and `machine_id`.
     - Assert `valid` and `reason`.
     - If `valid`, assert payload fields match exactly.
     - If `payload` is provided in vectors, assert it matches; otherwise it is optional.
   - Invalid format must return `invalid_format` (not a throw).

2) Fingerprint
   - Test mapping helpers using `platform_map` and `arch_map`.
   - Compute fingerprint from `components` and compare to `expected`.

3) Cache
   - Hash `product_id` and compare `expected_filename`.
   - For each case, run the refresh check:
     - If your implementation uses `now_ms()`, make a test helper that accepts
       `refresh_at` and a mocked `now_ms`.
     - Otherwise, use the provided past/future values directly.

4) License check flow
   - Implement a test-only pure function that takes the `input` shape and
     returns `{ final, cache_actions }`.
   - Compare to `expected`.

5) CLI JSON output
   - Run each case with `--json` enabled.
   - Match `exit_code` and the JSON payload (stdout for success, stderr for errors).
   - Tests should isolate config files per case.

## Reason Codes

Use these exact strings:
- `invalid_format`
- `invalid_signature`
- `expired`
- `machine_mismatch`
- `revoked`
- `network_error`
- `not_found`
