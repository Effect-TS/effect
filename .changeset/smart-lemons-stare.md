---
"@effect/schema": patch
---

Expose `exact` option for strict decoding on missing properties, closes #2993

This commit addresses an issue where users encountered unexpected decoding behaviors, specifically regarding how undefined values and missing properties are handled. The default behavior of the `@effect/schema` library treats missing properties as `undefined` during decoding, which can lead to confusion when stricter validation is expected.

Changes:

- Exposed an internal configuration option `exțact` (default: `false`), which when set to `true`, enforces strict decoding that will error on missing properties instead of treating them as `undefined`.
- Updated documentation to clearly outline the default and strict decoding behaviors, providing users with guidance on how to enable strict validation.
