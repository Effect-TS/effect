---
"effect": patch
---

Add the opt-in `effect/unstable/schema/SchemaCompiler` side-effect import. Load it during application startup to replace supported entries in the central `SchemaParser` cache with compiled parsers. Type-side schemas lazily use separate boolean validation, output-producing validation, and detailed decoding operations. Schemas with encodings enter compiled decoding directly, so transformations and middleware run once while their checkpoints independently resolve to compiled or interpreted parsers. Generated paths preserve `SchemaIssue` and `ParseOptions` behavior and fall back to the interpreter when dynamic function generation is unavailable.

`SchemaParser.is` and `Schema.is` now accept optional `ParseOptions`, captured when the type guard is created. Passing `disableChecks: true` is unsafe: it skips refinement checks, so the caller assumes responsibility for the resulting type narrowing.
