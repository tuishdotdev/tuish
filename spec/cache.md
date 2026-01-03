# License Cache Spec

## Cache Schema

Cached license JSON uses these fields:

```
{
  "licenseKey": "header.payload.signature",
  "cachedAt": 1700000000000,
  "refreshAt": 1700086400000,
  "productId": "prod_123",
  "machineFingerprint": "sha256_hex"
}
```

All timestamps are Unix epoch milliseconds.

## Refresh Policy

- `refreshAt = cachedAt + (24 * 60 * 60 * 1000)`
- `needs_refresh = now_ms() >= refreshAt`

## Storage Location

Default directory:

```
~/.tuish/licenses/
```

## Cache File Naming

Use the SHA256 hex of the product ID, truncated to 16 hex characters:

```
filename = sha256_hex(productId)[0:16] + ".json"
```

## Pseudocode

```
function cache_path(product_id):
  hash = sha256_hex(product_id)
  return join(storage_dir, hash[0:16] + ".json")

function save_cache(product_id, license_key, machine_fingerprint):
  now = now_ms()
  data = {
    licenseKey: license_key,
    cachedAt: now,
    refreshAt: now + 24h,
    productId: product_id,
    machineFingerprint: machine_fingerprint
  }
  write_json(cache_path(product_id), data)
```
