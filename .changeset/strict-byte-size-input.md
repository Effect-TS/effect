---
"effect": patch
---

Restrict `ByteSize.Input` strings to non-negative decimal integers without leading zeros, followed by a canonical SI or IEC symbol or lowercase unit name, with zero or one separating space. This catches malformed literals such as `"4Mb"`, `"100Kb"`, negative quantities, and exponent notation at compile time in all APIs accepting `ByteSize.Input`.

This is a source-breaking change. Replace arbitrary strings and fractional string quantities passed to `ByteSize.fromInput` or `ByteSize.fromInputUnsafe` with `ByteSize.fromString` or `ByteSize.fromStringUnsafe`, respectively. For other APIs accepting `ByteSize.Input`, parse those strings first and pass the resulting `ByteSize`. The string parsers retain exact fractional parsing and whitespace support, and reject quantities that do not represent whole bytes. Schema and Config string decoding retain their existing behavior. Numeric inputs still require runtime validation.
