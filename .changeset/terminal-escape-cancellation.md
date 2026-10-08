---
"@effect/platform-node-shared": patch
"@effect/platform-node": patch
"@effect/platform-bun": patch
"@effect/platform-deno": patch
---

Esc now ends terminal key input by default, cancelling CLI prompts with `Terminal.QuitError`. To keep Esc non-cancelling, pass a `shouldQuit` predicate to `make`, such as `(input) => input.key.ctrl && (input.key.name === "c" || input.key.name === "d")` to quit only on Ctrl+C or Ctrl+D.
