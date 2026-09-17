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
provide optional synchronous `decode` and `make` operations; normal
`SchemaParser` calls consume them transparently and retain `decodeEffect` and
`makeEffect` as the detailed fallbacks. AOT targets declare the operations to
prepare, so generated modules contain only those operation families and use
the interpreter if an omitted operation is later called.

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

`Transformation#compose` is replaced by the dual standalone function
`SchemaTransformation.composeTransformation`. Replace `first.compose(second)`
with `SchemaTransformation.composeTransformation(first, second)` or
`SchemaTransformation.composeTransformation(second)(first)`.

`SchemaTransformation.make` is renamed to
`SchemaTransformation.makeTransformation`. `SchemaTransformation.Transformation`
and `SchemaTransformation.Middleware` now implement `Pipeable`, so both values
can be passed through standalone combinators with `.pipe(...)`.

`SchemaAST.Context.constructorDefault` now stores the constructor-default
`Effect` directly instead of wrapping it in a `SchemaAST.Link`. Constructor
defaults apply only during construction, so the direct representation avoids
giving them encoding semantics and lets construction reuse already-completed
synchronous Effects. Code that constructs or inspects `SchemaAST.Context`
should pass or read the default `Effect` directly.
