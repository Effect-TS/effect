---
"@effect/platform-node-shared": minor
"@effect/platform-node": minor
"@effect/platform-bun": minor
"@effect/platform-deno": minor
---

Bare Esc now ends terminal key input by default, alongside Ctrl+C and Ctrl+D, so CLI prompts cancel with `Terminal.QuitError`. Consumers that need Esc to remain non-cancelling must pass an explicit `shouldQuit` predicate to their terminal module's `make`; to retain the previous defaults, use `(input) => input.key.ctrl && (input.key.name === "c" || input.key.name === "d")`. A supplied predicate replaces the default quit-key policy.
