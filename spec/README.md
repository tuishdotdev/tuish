# Tuish Common Logic Spec

This folder defines the canonical, language-agnostic behavior for Tuish SDK core
logic. Use it to keep implementations aligned across TS, Go, Rust, and Python.

Scope:
- License token format, parsing, and offline verification
- Machine fingerprinting
- Cache format and refresh rules
- License check flow (resolver + cache + online)
- Shared, language-neutral test vectors

Out of scope:
- HTTP client behavior (use OpenAPI definitions)
- UI rendering
- Storage adapters beyond the on-disk cache contract

Docs:
- `oss/spec/license.md`: token format, key parsing, verification pseudocode
- `oss/spec/fingerprint.md`: machine fingerprint canonical format
- `oss/spec/cache.md`: cache schema and refresh rules
- `oss/spec/flow.md`: license check state machine and pseudocode
- `oss/spec/tests/README.md`: shared test vectors and how to run them

Run all spec tests:

```
./oss/spec/run-spec-tests.sh
```
