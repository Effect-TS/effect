# task-001 — WebKit Inspector "taste-the-power" quickstart

## Objective
Deliver a runnable example that proves we can drive WebKit Inspector targets (Safari desktop + Bun’s hosted inspector) via scriptable tooling, aligned with the uXP goal of paste-and-run demos.

## Evidence of the Gap
- `.specs/debug/research.md:128-165` only opens GUI surfaces; no scripted `Runtime.evaluate` equivalent for Safari/Bun.
- There is no `.specs/debug/research-webkit.md`, so we lack consolidated notes on WebKit Inspector framing, transport, and message flow.

## Definition of Done
- `.specs/debug/research.md` gains a WebKit quickstart that issues a remote evaluation against Safari (macOS) and documents how the same flow reaches Bun’s inspector endpoint.
- A supporting research file (e.g., `.specs/debug/research-webkit.md`) explains the transport, handshake, and required tooling (`ios_webkit_debug_proxy`, `webkit-inspector-proxy`, or equivalent) with citations.
- Commands are runnable from macOS with minimal setup and echo a verifiable result (for example a JSON blob whose `result.value` equals `4`).
- Any new documentation references relevant `.patterns` expectations (no hidden try/catch, honour the Hard-Fail policy).

## Suggested Steps
1. Capture protocol notes for WebKit Inspector: message framing, discovery endpoints, and tooling (use existing knowledge plus referenced docs).
2. Prototype a CLI using `ios_webkit_debug_proxy` with `node` or `python` to send an `evaluate` payload; record the exact command sequence.
3. Update `.specs/debug/research.md` quickstart section for Safari/Bun to include the command and clarify prerequisites.
4. Cite official docs/blog posts that confirm the handshake and include troubleshooting notes per Hard-Fail policy.

## References
- `.patterns/platform-integration.md`
- `.patterns/effect-library-development.md`
- WebKit Inspector protocol docs (linked in research footnotes).
