---
title: ExecutionStrategy.ts
nav_order: 26
parent: Modules
---

## ExecutionStrategy overview

Added in v1.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [constructors](#constructors)
  - [parallel](#parallel)
  - [parallelN](#paralleln)
  - [sequential](#sequential)
- [folding](#folding)
  - [match](#match)
- [models](#models)
  - [ExecutionStrategy (type alias)](#executionstrategy-type-alias)
  - [Parallel (interface)](#parallel-interface)
  - [ParallelN (interface)](#paralleln-interface)
  - [Sequential (interface)](#sequential-interface)
- [refinements](#refinements)
  - [isParallel](#isparallel)
  - [isParallelN](#isparalleln)
  - [isSequential](#issequential)

---

# constructors

## parallel

Execute effects in parallel.

**Signature**

```ts
export declare const parallel: ExecutionStrategy
```

Added in v1.0.0

## parallelN

Execute effects in parallel, up to the specified number of concurrent fibers.

**Signature**

```ts
export declare const parallelN: (parallelism: number) => ExecutionStrategy
```

Added in v1.0.0

## sequential

Execute effects sequentially.

**Signature**

```ts
export declare const sequential: ExecutionStrategy
```

Added in v1.0.0

# folding

## match

Folds over the specified `ExecutionStrategy` using the provided case
functions.

**Signature**

```ts
export declare const match: {
  <A>(onSequential: LazyArg<A>, onParallel: LazyArg<A>, onParallelN: (n: number) => A): (self: ExecutionStrategy) => A
  <A>(self: ExecutionStrategy, onSequential: LazyArg<A>, onParallel: LazyArg<A>, onParallelN: (n: number) => A): A
}
```

Added in v1.0.0

# models

## ExecutionStrategy (type alias)

Describes a strategy for evaluating multiple effects, potentially in
parallel.

There are 3 possible execution strategies: `Sequential`, `Parallel`,
`ParallelN`.

**Signature**

```ts
export type ExecutionStrategy = Sequential | Parallel | ParallelN
```

Added in v1.0.0

## Parallel (interface)

Execute effects in parallel.

**Signature**

```ts
export interface Parallel {
  readonly _tag: 'Parallel'
}
```

Added in v1.0.0

## ParallelN (interface)

Execute effects in parallel, up to the specified number of concurrent fibers.

**Signature**

```ts
export interface ParallelN {
  readonly _tag: 'ParallelN'
  readonly parallelism: number
}
```

Added in v1.0.0

## Sequential (interface)

Execute effects sequentially.

**Signature**

```ts
export interface Sequential {
  readonly _tag: 'Sequential'
}
```

Added in v1.0.0

# refinements

## isParallel

Returns `true` if the specified `ExecutionStrategy` is an instance of
`Sequential`, `false` otherwise.

**Signature**

```ts
export declare const isParallel: (self: ExecutionStrategy) => self is Parallel
```

Added in v1.0.0

## isParallelN

Returns `true` if the specified `ExecutionStrategy` is an instance of
`Sequential`, `false` otherwise.

**Signature**

```ts
export declare const isParallelN: (self: ExecutionStrategy) => self is ParallelN
```

Added in v1.0.0

## isSequential

Returns `true` if the specified `ExecutionStrategy` is an instance of
`Sequential`, `false` otherwise.

**Signature**

```ts
export declare const isSequential: (self: ExecutionStrategy) => self is Sequential
```

Added in v1.0.0
