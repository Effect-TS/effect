---
"effect": patch
---

Add the opt-in `SchemaCompiler.enable()` function. Call it during application startup to lazily compile supported synchronous decoders while continuing to use the normal `SchemaParser.decodeUnknownSync` interface. Unsupported schemas, explicit parse options, and environments without dynamic function generation continue through the interpreter.
