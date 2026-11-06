---
"@effect/openapi-generator": patch
---

Add an opt-in `int64AsBigInt` option (`--int64-as-bigint` on the CLI) that generates `type: ["string", "integer"], format: "int64"` schemas as a shared `Int64` codec. It decodes decimal strings and safe integers into a bigint branded as `Int64`, checks the signed 64-bit range, and encodes back to a decimal string.
