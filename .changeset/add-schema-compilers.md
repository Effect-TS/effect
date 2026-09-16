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
module through Effect's `FileSystem` and `Path` services. Compiled decoders can
provide an optional synchronous `make` operation for construction-safe schemas;
normal `SchemaParser.make` calls consume it transparently and retain
`makeEffect` as the detailed fallback.

### Breaking changes

`SchemaGetter.Getter` is now a tagged union that distinguishes synchronous,
optional, and effectful transformations. Getter values now expose only `pipe`.
Use the dual `SchemaGetter.map`, `SchemaGetter.compose`, and `SchemaGetter.run`
functions instead of the former methods. Keeping these operations standalone
lets bundlers remove composition code when an application does not use it.

The public `Getter` constructor is removed. Use
`SchemaGetter.transformOptionalEffect` instead of `new SchemaGetter.Getter`.
`SchemaGetter.onSome` and `SchemaGetter.onNone` are also removed. Use
`transformEffect` for an effectful transformation of present values and
`transformOptionalEffect` when the transformation handles missing values.

`SchemaTransformation.compose` is now a dual standalone function. Replace
`first.compose(second)` with `SchemaTransformation.compose(first, second)` or
`SchemaTransformation.compose(second)(first)`.
