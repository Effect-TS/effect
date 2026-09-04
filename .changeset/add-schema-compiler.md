---
"effect": patch
---

Add the opt-in `effect/unstable/schema/SchemaCompiler` side-effect import. Load it during application startup to replace supported entries in the central `SchemaParser` cache with compiled parsers. Encoding-free schemas use a generated fast phase for valid input and a lazy diagnostic phase that preserves `SchemaIssue` and `ParseOptions` behavior. Schemas with encodings enter compiled decoding directly, so transformations and middleware run once while their checkpoints independently resolve to compiled or interpreted parsers. Generated paths fall back to the interpreter when dynamic function generation is unavailable.
