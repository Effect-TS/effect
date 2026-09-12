---
"effect": patch
---

Add experimental JIT and AOT schema compilers that work through the existing
`SchemaParser` APIs and share a decoder registry. Enable JIT globally with
`effect/unstable/schema/SchemaJITCompiler/enable`, selectively with
`SchemaJITCompiler.enable(ast)`, or install generated AOT decoders without
requiring dynamic function construction. The new
`effect/unstable/schema/SchemaAOTCompiler/Build` entrypoint discovers direct
Schema exports from explicit module loaders and writes a self-installing AOT
module through Effect's `FileSystem` and `Path` services.
