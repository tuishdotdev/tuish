# License Token + Verification Spec

## Token Format

License strings are three base64url parts separated by dots:

```
<header_b64url>.<payload_b64url>.<signature_b64url>
```

Encoding rules:
- Base64url (URL-safe, no padding).
- JSON is UTF-8, minified (no whitespace).

### Header JSON

```
{
  "alg": "ed25519",
  "ver": 1
}
```

### Payload JSON

```
{
  "lid": "license_id",
  "pid": "product_id",
  "cid": "customer_id",
  "did": "developer_id",
  "features": ["feature_a", "feature_b"],
  "iat": 1700000000000,
  "exp": 1700003600000,    // or null for perpetual
  "mid": "machine_fingerprint" // or null/empty for unbound
}
```

Notes:
- `iat` and `exp` are Unix epoch milliseconds.
- `exp = null` means perpetual.
- `mid` may be `null` or empty to indicate "unbound".

## Canonical JSON Key Order (for signing)

To ensure deterministic signatures across languages, sign using these key
orders (no extra fields, no whitespace):

Header order:
1. `alg`
2. `ver`

Payload order:
1. `lid`
2. `pid`
3. `cid`
4. `did`
5. `features`
6. `iat`
7. `exp`
8. `mid`

## Public Key Formats

Implementations must accept either:

1) SPKI base64 (Ed25519), 44 bytes when decoded.
   - Decode base64.
   - Verify length == 44 bytes.
   - Extract raw key bytes from the last 32 bytes.

2) Raw public key hex (64 hex chars, 32 bytes).

## Private Key Formats (for signing / tests)

Implementations that sign should accept either:

1) PKCS8 base64 (Ed25519), 48 bytes when decoded.
   - Decode base64.
   - Verify length == 48 bytes.
   - Extract raw key bytes from the last 32 bytes.

2) Raw private key hex (64 hex chars, 32 bytes).

## Verification Pseudocode

```
function verify_license(license_string, public_key_hex, machine_id?):
  parsed = parse_license(license_string)
  if parsed is error:
    return { valid: false, reason: "invalid_format" }

  header_b64, payload_b64, signature_b64 = parsed.raw_parts
  message = header_b64 + "." + payload_b64
  signature_bytes = base64url_decode(signature_b64)
  public_key_bytes = hex_decode(public_key_hex)

  if ed25519_verify(public_key_bytes, message, signature_bytes) == false:
    return { valid: false, reason: "invalid_signature" }

  if parsed.payload.exp is not null and parsed.payload.exp < now_ms():
    return { valid: false, payload?: parsed.payload, reason: "expired" }

  if machine_id is not null and parsed.payload.mid is not null and parsed.payload.mid != "" and parsed.payload.mid != machine_id:
    return { valid: false, payload?: parsed.payload, reason: "machine_mismatch" }

  return { valid: true, payload: parsed.payload }
```

## Parse Pseudocode

```
function parse_license(license_string):
  parts = split(license_string, ".")
  if len(parts) != 3: error invalid_format
  header_b64, payload_b64, signature_b64 = parts
  if any part empty: error invalid_format

  header_json = json_parse(base64url_decode(header_b64))
  payload_json = json_parse(base64url_decode(payload_b64))
  signature_bytes = base64url_decode(signature_b64)

  if header_json.alg != "ed25519" or header_json.ver != 1:
    error invalid_format

  return { header, payload, signature_bytes, raw_parts: parts }
```

## Invalid Reasons

When a license is invalid, use one of:
- `invalid_format`
- `invalid_signature`
- `expired`
- `machine_mismatch`

## Payload on Invalid Results

Implementations may include the parsed payload on invalid results (recommended
for `expired` and `machine_mismatch`). When provided, it must match the parsed
payload from the license string.
