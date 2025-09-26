# `@effect-native/patterns`

Hands-on study material for the Effect Native codebase. Each module in this
package illustrates the expectations described in the normative pattern library
(`.patterns/*.md`).

## Thing

`Thing` is a deliberately small data type that demonstrates several of the
library-wide rules:

- **Type identifiers**: every instance carries a stable `TypeId` symbol so it
  can be recognised safely across module boundaries.
- **Structural protocols**: the prototype implements `Equal.symbol` and
  `Hash.symbol`, using `Hash.cached` plus sorted, deduplicated tags to keep hash
  codes deterministic.
- **Dual combinators**: higher-order helpers like `mapValue` and `addTag` are
  exposed with `dual` so they support both data-first and data-last styles.
- **Pipeable**: the prototype delegates to Effect's `pipeArguments` helper so
  instances compose naturally with `.pipe(...)`.

The accompanying tests in `test/Thing.test.ts` follow the
`@effect/vitest` conventions from `.patterns/testing-patterns.md`, showing how
structured data (`Data.struct`) integrates with `Equal`/`Hash`.

## Usage

```ts
import * as Thing from "@effect-native/patterns/Thing"

const todo = Thing.make({
  id: "add-patterns-docs",
  label: "Write README",
  value: { done: false }
})

const updated = todo.pipe(
  Thing.mapValue((value) => ({ ...value, done: true })),
  Thing.addTag("docs")
)
```

Run `pnpm --filter @effect-native/patterns test` inside `nix develop` to execute
the worked examples.

## List

`List` models a functional, singly-linked sequence with all of the idioms we
lean on in production code:

- **Pipeable structure**: every list is `Pipeable`, so you can chain
  transformations without reaching for helpers.
- **Structural equality**: the prototype implements `Equal.symbol` and
  `Hash.symbol` by walking the nodes to ensure hashing follows value semantics.
- **Dual combinators**: helpers like `cons`, `append`, `map`, `reduce`, and
  `forEachEffect` all use `dual` so they work in both data-first and data-last
  styles.
- **Effect traversal**: `forEachEffect` demonstrates how to loop over the
  structure within `Effect.gen`, yielding each node sequentially.

The tests in `test/List.test.ts` include examples covering both pure and
Effectful usage while applying the guardrails in `.patterns/testing-patterns.md`.

## Tree

`Tree` demonstrates how to build richer recursive data models:

- **Structured construction**: `make` accepts immutable child collections, and
  every node tracks its subtree size for quick introspection.
- **Deep equality / hashing**: the prototype walks child trees to implement
  `Equal.symbol` and `Hash.symbol`, ensuring structural comparison works across
  nested data.
- **Dual helpers**: `appendChild`, `map`, and `reduce` all support data-first
  and data-last usage via `dual`, mirroring the conventions in the Effect
  standard library.
- **Effectful traversal**: `forEachEffect` produces depth-first visitation with
  index paths, showing how to integrate recursion with `Effect.gen`.

See `test/Tree.test.ts` for executable examples that combine pure and Effectful
workloads.
