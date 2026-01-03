#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"

need_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "[spec] missing required command: $1" >&2
    exit 1
  }
}

need_cmd pnpm
need_cmd go
need_cmd cargo
need_cmd python3

echo "[spec] repo: ${ROOT_DIR}"

echo "[spec] TypeScript"
(cd "${ROOT_DIR}" && pnpm --filter @tuish/sdk test)

echo "[spec] Go"
(cd "${ROOT_DIR}/oss/go" && go test . -run TestSpecVectors)

echo "[spec] Rust"
(cd "${ROOT_DIR}/oss/rs" && cargo test spec_)

echo "[spec] Python"
(
  cd "${ROOT_DIR}/oss/py"
  TMP_ROOT="$(mktemp -d)"
  trap 'rm -rf "${TMP_ROOT}"' EXIT
  VENV_DIR="${TMP_ROOT}/venv"
  PYCACHE_DIR="${TMP_ROOT}/pycache"
  python3 -m venv "${VENV_DIR}"
  PIP_DISABLE_PIP_VERSION_CHECK=1 "${VENV_DIR}/bin/pip" install -e '.[dev]'
  PYTHONDONTWRITEBYTECODE=1 PYTHONPYCACHEPREFIX="${PYCACHE_DIR}" \
    "${VENV_DIR}/bin/pytest" tests/test_spec_vectors.py
)
