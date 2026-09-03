---
"effect": patch
---

Add the opt-in `effect/unstable/schema/SchemaCompiler` side-effect import. Load it during application startup to lazily compile supported synchronous decoders and type guards while continuing to use the normal `SchemaParser` APIs. Unsupported schemas, explicit parse options, and environments without dynamic function generation continue through the interpreter.
