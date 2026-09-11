---
"effect": patch
---

Add experimental JIT and AOT schema compilers that work through the existing
`SchemaParser` APIs and share a decoder registry. Enable JIT globally with
`effect/unstable/schema/SchemaJITCompiler/enable`, selectively with
`SchemaJITCompiler.enable(ast)`, or install generated AOT decoders without
requiring dynamic function construction.
