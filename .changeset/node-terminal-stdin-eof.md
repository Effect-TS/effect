---
"@effect/platform-node-shared": patch
---

NodeTerminal: signal end-of-input at stdin EOF instead of hanging. `readInput` now ends its input queue when stdin ends, so `Prompt.run` fails with `Terminal.QuitError` on piped or closed stdin (buffered keypresses still deliver first), and `readLine` fails with `Terminal.QuitError` when input closes. Also applies to `BunTerminal`, which reuses this implementation.
