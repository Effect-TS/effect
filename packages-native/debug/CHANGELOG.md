# @effect-native/debug

## 0.1.0

### Minor Changes

- [#154](https://github.com/effect-native/effect-native/pull/154) [`a5fa563`](https://github.com/effect-native/effect-native/commit/a5fa5633f05622b2b26165df531306a939e4112b) Thanks @subtleGradient! - Add `debug-steps` CLI tool for stepping through Node.js scripts line-by-line using the debugger protocol.

  Users can now run:

  ```bash
  npx @effect-native/debug steps ./my-script.js
  ```

  The CLI automatically:
  - Launches the script with Node.js inspector enabled
  - Connects to the debugger protocol
  - Steps through every line of execution
  - Displays function name, line number, and source code for each step
  - Supports `--max-steps` and `--port` options

  See `CLI.md` for full documentation.

- [#154](https://github.com/effect-native/effect-native/pull/154) [`a5fa563`](https://github.com/effect-native/effect-native/commit/a5fa5633f05622b2b26165df531306a939e4112b) Thanks @subtleGradient! - **BREAKING CHANGE**: Refactored `steps` CLI to accept WebSocket URLs instead of launching Node.js processes

  ## Breaking Changes

  The `steps` command no longer accepts a file path and automatically launches Node.js. Instead, you must start your runtime with debugging enabled and pass the inspector endpoint to the CLI.

  **Old API (removed):**

  ```bash
  npx @effect-native/debug steps ./my-script.js --port 9229
  ```

  **New API:**

  ```bash
  # Terminal 1: Start your app with debugging enabled
  node --inspect-brk=9229 my-script.js

  # Terminal 2: Connect the stepper
  npx @effect-native/debug steps --ws-url 127.0.0.1:9229
  ```

  ## New Features
  - **Auto-discovery**: Pass simple endpoints like `127.0.0.1:9229` and the CLI automatically discovers the WebSocket URL (no need for `curl` or `jq`)
  - **Multi-runtime support**: Works with any CDP-compatible runtime including Node.js, Bun, Deno, Cloudflare Workers, and Chrome/Chromium browsers
  - **Flexible input**: Accepts `127.0.0.1:9229`, `http://127.0.0.1:9229`, or full WebSocket URLs like `ws://127.0.0.1:9229/abc-123`
  - **Skip Node.js internals**: Automatically filters out `node:*` modules and `node_modules/` to only step through user code

  ## Migration Guide
  1. Start your runtime with `--inspect` or `--inspect-brk` flag
  2. Use `--ws-url` option instead of passing a file path
  3. Pass the HTTP endpoint (e.g., `127.0.0.1:9229`) and let the CLI discover the WebSocket URL

  For automation scripts, see `packages-native/debug/bin/test-steps.sh` for a complete example.

- [#154](https://github.com/effect-native/effect-native/pull/154) [`a5fa563`](https://github.com/effect-native/effect-native/commit/a5fa5633f05622b2b26165df531306a939e4112b) Thanks @subtleGradient! - NEW experimental debug tooling
