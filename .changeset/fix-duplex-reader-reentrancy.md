---
"@effect/platform-node-shared": patch
"@effect/platform-node": patch
"@effect/platform-bun": patch
---

Fix duplex socket readers throwing when a pull is interrupted or its scope closes during a read. Preserve consumed bytes in order across pull interruption and normal EOF, while discarding them when the reader scope closes.
