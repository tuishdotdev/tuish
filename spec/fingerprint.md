# Machine Fingerprint Spec

## Canonical Format

The machine fingerprint is the SHA256 hex of:

```
hostname:username:platform:arch
```

All four components are required and joined with `:` (no whitespace).

### Platform Mapping (canonical)

Implementations must map to the Node.js `os.platform()` strings:
- macOS -> `darwin`
- Linux -> `linux`
- Windows -> `win32`
- FreeBSD -> `freebsd`
- NetBSD -> `netbsd`
- OpenBSD -> `openbsd`
- Other -> use the lowercased platform identifier as-is

### Architecture Mapping (canonical)

Implementations must map to the Node.js `os.arch()` strings:
- x86_64 / amd64 -> `x64`
- aarch64 / arm64 -> `arm64`
- arm -> `arm`
- x86 / i386 / i686 -> `ia32`
- Other -> use the lowercased arch identifier as-is

### Hashing

```
fingerprint = sha256_hex(components_string)
```

Where `sha256_hex` returns lowercase hex (64 characters).

## Pseudocode

```
function machine_fingerprint():
  hostname = get_hostname() or "unknown"
  username = get_username() or "unknown"
  platform = map_platform(get_platform())
  arch = map_arch(get_arch())

  input = hostname + ":" + username + ":" + platform + ":" + arch
  return sha256_hex(input)
```

## Notes

- This is a stability-focused identifier, not a secure hardware fingerprint.
- Any change to the input components will change the hash.
