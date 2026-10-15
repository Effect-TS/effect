---
"effect": minor
---

Add the unstable `Schema.toCodecGoJson` codec for Go JSON responses. It normalizes optional-key `null` values to missing keys and required array or record `null` values to empty collections, while preserving schemas that already accept `null`. Encoding is unchanged from `Schema.toCodecJson`.
