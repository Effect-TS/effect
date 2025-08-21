#!/usr/bin/env bash
# for use in the hosted OpenAI Codex environment as both the setup and maintenance scripts
# setup.sh — idempotent setup + maintenance for this repo
# Usage: scripts/setup.sh (from repo root)
# Optional: DEV_SHELL=".#ci" to pick a specific devShell

set -euo pipefail

DEV_SHELL="${DEV_SHELL:-.}"

need_nix() {
  ! command -v nix >/dev/null 2>&1
}

install_nix_if_needed() {
  if need_nix; then
    echo "[setup] Nix not found; installing..."
    curl -fsSL https://install.determinate.systems/nix \
    | sh -s -- install linux --init none --no-confirm \
      --extra-conf "sandbox = false" \
      --extra-conf "experimental-features = nix-command flakes"
  else
    echo "[setup] Nix already installed; skipping install"
  fi
}

ensure_nix_env() {
  # Ensure PATH contains Nix; source profile scripts if present
  export PATH="/nix/var/nix/profiles/default/bin:${PATH:-}"
  local daemon="/nix/var/nix/profiles/default/etc/profile.d/nix-daemon.sh"
  local single="/nix/var/nix/profiles/default/etc/profile.d/nix.sh"
  [ -r "$daemon" ] && . "$daemon"
  [ -r "$single" ] && . "$single"
}

run_inside_dev_shell() {
  # Use bash (not sh) to avoid completion-related errors in shell hooks
  nix develop -L "$DEV_SHELL" --accept-flake-config \
    --extra-experimental-features "nix-command flakes" \
    -c bash -lc '
      set -euo pipefail
      export CI=1  # Force Vitest to run in CI mode (disable watch / interactive UI)
      corepack enable || true
      pnpm --version || true

      echo "[setup] pnpm install"
      pnpm install --reporter=append-only --no-color

      # allow build/codegen to fail without aborting tests
      set +e
      echo "[setup] pnpm build"
      pnpm build
      build_exit=$?

      echo "[setup] pnpm codegen"
      pnpm codegen
      codegen_exit=$?
      set -e

      if [ "$build_exit" -ne 0 ]; then
        echo "WARN: pnpm build failed (exit $build_exit)"
      fi
      if [ "$codegen_exit" -ne 0 ]; then
        echo "WARN: pnpm codegen failed (exit $codegen_exit)"
      fi

      # echo "[setup] pnpm test"
      # pnpm test
    '
}

main() {
  install_nix_if_needed
  ensure_nix_env
  nix --version
  run_inside_dev_shell
}

main "$@"
