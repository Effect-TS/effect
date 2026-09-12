# Compiler rebuild comparison

The `compiler-rebuild` suite measures 22 public SchemaParser operations with the
interpreter, selective JIT and generated AOT modules. Eighteen cases also run
against `z.compile(schema, { strict: true })`; ten representative cases also
run against Valibot. The fixture families name the execution mode. Cases
cover simple and nested Structs, Arrays, tuples, Records, anyOf/oneOf Unions,
transformations, middleware, recursive schemas, Declarations, construction,
and successful and failing validation.

The Effect tuple has a trailing element after its rest element, Zod compilation
does not support recursive schemas or `z.xor`, and Zod has no equivalent
decoding middleware. Those four cases intentionally have no Zod fixture. Zod
compilation only accelerates forward parsing, so the encode case measures its
documented runtime fallback. Zod parsing stands in for Effect construction
because Zod has no separate constructor operation. Valibot parsing with defaults
is used for the same comparison.

```sh
pnpm runtimeperf-compare compiler-rebuild --base schema-compiler
pnpm runtimeperf-compare compiler-rebuild --base main --family interpreted
pnpm runtimeperf compiler-rebuild
```

The first command compares the current working tree with the archived compiler
branch. The second isolates changes to interpreted parsing against main. Schema
and parser construction are outside the steady-state measurements. AOT fixtures
generate their version-specific module in a separate process before loading it.

The standard paired harness records five alternating rounds, validates every
fixture before and after measurement, uses a common batch within each pair, and
reports bootstrap confidence intervals. Cross-mode rankings are descriptive;
the paired base/head comparison is the regression evidence.

## Retained heap and first use

The standalone cost probe accepts a checkout root, mode, operation, shape and
schema count. Run several fresh processes per combination and alternate the
checkout order. Supported modes are `interpreted`, `jit` and `aot`; operations
are `decode`, `invalid`, `is` and `make`; shapes are `struct`, `array`, `transform`
and `default`.

```sh
node --expose-gc packages/effect/runtimeperf/suites/compiler-rebuild/costs.mts heap "$PWD" jit decode struct 500
node --expose-gc packages/effect/runtimeperf/suites/compiler-rebuild/costs.mts cold "$PWD" jit decode struct 500
```

Heap measurements exclude schema construction and module imports, and retain
both schema objects and public parser functions. They include operation setup
and first use. Forced GC removes transient parse output and issues. The AOT
generator runs in a separate process, so its retained heap is not attributed to
the runtime application.

First-use measurements include constructing a fresh schema, installing its
compiler when requested, creating a public parser and calling it. They exclude
module imports and AOT source generation. Repeated shapes can benefit from V8's
source cache, so this is not process startup latency. Treat these timing probes
as exploratory, separately from the paired throughput results.
