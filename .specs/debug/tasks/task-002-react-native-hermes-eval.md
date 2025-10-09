# task-002 — React Native Hermes CDP quickstart

## Objective
Show, with a copy-pastable workflow, that Metro’s inspector proxy lets us send CDP `Runtime.evaluate` commands into a Hermes runtime without relying on the React Native DevTools GUI.

## Evidence of the Gap
- `.specs/debug/research.md:167-175` instructs developers to press `j` to open DevTools but never proves command execution.
- `.specs/debug/research-react-native.md:5-32` documents Metro’s CDP discovery (`/json/list`) and proxy WebSockets, so a scripted flow should be possible.

## Definition of Done
- `.specs/debug/research.md` includes a React Native quickstart that resolves a Metro discovery URL, connects to the Hermes inspector WebSocket, issues `Runtime.evaluate`, and shows the returned value.
- Any helper script or command lists prerequisites (Hermes enabled, Metro running) and references the `jsinspector-modern` CDP plumbing.
- Troubleshooting guidance addresses common failure modes (no device registered, RN DevTools already connected) per Hard-Fail policy.

## Suggested Steps
1. Re-read `.specs/debug/research-react-native.md` to extract exact endpoint shapes (`/json`, `/inspector/debug`).
2. Draft a shell + `node`/`python` snippet that fetches the first Hermes target ID and relays a `Runtime.evaluate` request through Metro.
3. Validate the snippet against known Hermes inspector message formats (refer to `Device.js` + `CdpJson` notes).
4. Update the main research quickstart plus cite relevant documentation.

## References
- `.specs/debug/research-react-native.md`
- `packages/dev-middleware/README.md` and related code (documented in research file)
- `.patterns/testing-patterns.md` (reminder to keep eventual tests effectful)
