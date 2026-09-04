---
"effect": patch
---

Add a shared `SchemaCompiler` decoder registry and the experimental `SchemaJITCompiler`. Import `effect/unstable/schema/SchemaJITCompiler/enable` to enable lazy JIT compilation globally, call `SchemaJITCompiler.enable(ast)` to enable it for one AST, or use `SchemaCompiler.set(ast, decoder)` to install a trusted JIT or AOT decoder in the same registry. Type-side schemas lazily use separate boolean validation, output-producing validation, and detailed decoding operations. Schemas with encodings enter compiled decoding directly, so transformations and middleware run once while their checkpoints independently resolve to compiled or interpreted parsers. Generated paths preserve `SchemaIssue` and `ParseOptions` behavior and fall back to the interpreter when dynamic function generation is unavailable.

`SchemaParser.is` and `Schema.is` now accept optional `ParseOptions`, captured when the type guard is created. Passing `disableChecks: true` is unsafe: it skips refinement checks, so the caller assumes responsibility for the resulting type narrowing.
