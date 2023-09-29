---
title: ChannelMergeStrategy.ts
nav_order: 10
parent: Modules
---

## ChannelMergeStrategy overview

Added in v1.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [constructors](#constructors)
  - [BackPressure](#backpressure)
  - [BufferSliding](#buffersliding)
- [folding](#folding)
  - [match](#match)
- [models](#models)
  - [BackPressure (interface)](#backpressure-interface)
  - [BufferSliding (interface)](#buffersliding-interface)
  - [MergeStrategy (type alias)](#mergestrategy-type-alias)
- [refinements](#refinements)
  - [isBackPressure](#isbackpressure)
  - [isBufferSliding](#isbuffersliding)
  - [isMergeStrategy](#ismergestrategy)
- [symbols](#symbols)
  - [MergeStrategyTypeId](#mergestrategytypeid)
  - [MergeStrategyTypeId (type alias)](#mergestrategytypeid-type-alias)
- [utils](#utils)
  - [MergeStrategy (namespace)](#mergestrategy-namespace)
    - [Proto (interface)](#proto-interface)

---

# constructors

## BackPressure

**Signature**

```ts
export declare const BackPressure: (_: void) => MergeStrategy
```

Added in v1.0.0

## BufferSliding

**Signature**

```ts
export declare const BufferSliding: (_: void) => MergeStrategy
```

Added in v1.0.0

# folding

## match

Folds an `MergeStrategy` into a value of type `A`.

**Signature**

```ts
export declare const match: {
  <A>(options: { readonly onBackPressure: () => A; readonly onBufferSliding: () => A }): (self: MergeStrategy) => A
  <A>(self: MergeStrategy, options: { readonly onBackPressure: () => A; readonly onBufferSliding: () => A }): A
}
```

Added in v1.0.0

# models

## BackPressure (interface)

**Signature**

```ts
export interface BackPressure extends MergeStrategy.Proto {
  readonly _tag: 'BackPressure'
}
```

Added in v1.0.0

## BufferSliding (interface)

**Signature**

```ts
export interface BufferSliding extends MergeStrategy.Proto {
  readonly _tag: 'BufferSliding'
}
```

Added in v1.0.0

## MergeStrategy (type alias)

**Signature**

```ts
export type MergeStrategy = BackPressure | BufferSliding
```

Added in v1.0.0

# refinements

## isBackPressure

Returns `true` if the specified `MergeStrategy` is a `BackPressure`, `false`
otherwise.

**Signature**

```ts
export declare const isBackPressure: (self: MergeStrategy) => self is BackPressure
```

Added in v1.0.0

## isBufferSliding

Returns `true` if the specified `MergeStrategy` is a `BufferSliding`, `false`
otherwise.

**Signature**

```ts
export declare const isBufferSliding: (self: MergeStrategy) => self is BufferSliding
```

Added in v1.0.0

## isMergeStrategy

Returns `true` if the specified value is a `MergeStrategy`, `false`
otherwise.

**Signature**

```ts
export declare const isMergeStrategy: (u: unknown) => u is MergeStrategy
```

Added in v1.0.0

# symbols

## MergeStrategyTypeId

**Signature**

```ts
export declare const MergeStrategyTypeId: typeof MergeStrategyTypeId
```

Added in v1.0.0

## MergeStrategyTypeId (type alias)

**Signature**

```ts
export type MergeStrategyTypeId = typeof MergeStrategyTypeId
```

Added in v1.0.0

# utils

## MergeStrategy (namespace)

Added in v1.0.0

### Proto (interface)

**Signature**

```ts
export interface Proto {
  readonly [MergeStrategyTypeId]: MergeStrategyTypeId
}
```

Added in v1.0.0
