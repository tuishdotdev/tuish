# License Check Flow

This section defines the canonical decision logic for license checks. It is
intended to be implemented the same way across languages, even if the IO layers
are different.

## Pseudocode

```
function check_license():
  machine = get_machine_fingerprint()

  if resolver exists:
    resolved = resolver.resolve(product_id)
    if resolved:
      offline = verify_offline(resolved.license_key, machine)
      if offline.valid:
        save_cache(resolved.license_key, machine)
        return offline

      if offline.reason in ["expired", "invalid_signature"]:
        online = validate_online(resolved.license_key, machine)
        if online.valid:
          save_cache(resolved.license_key, machine)
        return online

      // for other offline failures, fall through to cache check

  cached = load_cache(product_id)
  if cached:
    offline = verify_offline(cached.license_key, machine)
    if offline.valid:
      if cache_is_fresh(cached):
        return offline

      online = validate_online(cached.license_key, machine)
      if online.valid:
        save_cache(cached.license_key, machine)
        return online
      if online.reason == "network_error":
        return offline

      remove_cache(product_id)
      return online

    if offline.reason == "expired":
      online = validate_online(cached.license_key, machine)
      if not online.valid:
        remove_cache(product_id)
      return online

    remove_cache(product_id)
    return offline

  return { valid: false, reason: "not_found", offline_verified: false }
```

## State Machine (Mermaid)

```mermaid
flowchart TD
  start([start]) --> resolver{resolver?}
  resolver -->|no| cache
  resolver -->|yes| resolved{license found?}
  resolved -->|no| cache
  resolved -->|yes| res_offline[verify offline]
  res_offline -->|valid| res_cache[save cache] --> ok_offline((return offline valid))
  res_offline -->|expired or invalid_signature| res_online[validate online]
  res_online -->|valid| res_cache2[save cache] --> ok_online((return online valid))
  res_online -->|invalid| bad_online((return online invalid))
  res_offline -->|other invalid| cache

  cache[load cache] --> cache_found{found?}
  cache_found -->|no| not_found((return not_found))
  cache_found -->|yes| cache_offline[verify offline]
  cache_offline -->|valid| cache_fresh{fresh?}
  cache_fresh -->|yes| ok_cache((return offline valid))
  cache_fresh -->|no| cache_online[validate online]
  cache_online -->|valid| cache_save[save cache] --> ok_online2((return online valid))
  cache_online -->|network_error| ok_cache2((return offline valid))
  cache_online -->|invalid| cache_remove1[remove cache] --> bad_cache((return online invalid))
  cache_offline -->|expired| cache_online2[validate online] --> cache_online2_done{valid?}
  cache_online2_done -->|yes| ok_online3((return online valid))
  cache_online2_done -->|no| cache_remove2[remove cache] --> bad_cache2((return online invalid))
  cache_offline -->|other invalid| cache_remove3[remove cache] --> bad_offline((return offline invalid))
```

## Notes

- "offline" refers to local signature verification only.
- "online" refers to API validation.
- Resolver is optional (TS SDK currently supports this as a pre-cache hook).
