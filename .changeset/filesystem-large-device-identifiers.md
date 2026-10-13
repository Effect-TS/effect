---
"@effect/platform-node-shared": patch
"effect": patch
---

Fix Node and Bun file stat operations rejecting large device identifiers. Interpret `dev` as an unsigned 64-bit value and convert it to a number, matching Node's non-bigint stats, while preserving the existing `File.Info` API. Document the possible precision loss for device identifiers outside the safe integer range.
