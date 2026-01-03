# CLI JSON Output

This spec defines the headless JSON mode for Tuish CLIs across languages.
Use it to keep `--json` output consistent and machine-testable.

## Required Behavior

When `--json` (or `-j`) is provided:
- Disable interactive prompts (no stdin reads).
- Emit exactly one JSON value to stdout on success.
- Emit exactly one JSON object to stderr on error: `{"error":"..."}`
- Exit `0` on success, non-zero on error.
- Do not print ANSI styling or extra text outside the JSON payload.

## Common Responses

Login success:
```json
{ "success": true, "message": "API key stored successfully" }
```

Logout success:
```json
{ "success": true, "message": "Logged out successfully" }
```

Missing API key (login with no key):
```json
{ "error": "API key is required" }
```

Missing auth (commands that require a stored key):
```json
{ "error": "No API key found; run tuish login" }
```

## Not Implemented Placeholder

For commands that do not yet call a backend API, return:
```json
{
  "status": "not_implemented",
  "title": "Products",
  "message": "Listing products will be added once the API is available."
}
```

## Keys Output (if present)

```json
{ "apiKey": "tuish_sk_...", "apiBaseUrl": "https://api.tuish.dev" }
```

`apiBaseUrl` is optional if not configured.

## Test Vectors

Shared CLI vectors live in:
- `oss/spec/tests/vectors/cli.json`
