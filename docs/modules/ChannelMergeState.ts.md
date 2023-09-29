---
title: ChannelMergeState.ts
nav_order: 9
parent: Modules
---

## ChannelMergeState overview

Added in v1.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [constructors](#constructors)
  - [BothRunning](#bothrunning)
  - [LeftDone](#leftdone)
  - [RightDone](#rightdone)
- [folding](#folding)
  - [match](#match)
- [models](#models)
  - [BothRunning (interface)](#bothrunning-interface)
  - [LeftDone (interface)](#leftdone-interface)
  - [MergeState (type alias)](#mergestate-type-alias)
  - [RightDone (interface)](#rightdone-interface)
- [refinements](#refinements)
  - [isBothRunning](#isbothrunning)
  - [isLeftDone](#isleftdone)
  - [isMergeState](#ismergestate)
  - [isRightDone](#isrightdone)
- [symbols](#symbols)
  - [MergeStateTypeId](#mergestatetypeid)
  - [MergeStateTypeId (type alias)](#mergestatetypeid-type-alias)
- [utils](#utils)
  - [MergeState (namespace)](#mergestate-namespace)
    - [Proto (interface)](#proto-interface)

---

# constructors

## BothRunning

**Signature**

```ts
export declare const BothRunning: <Env, Err, Err1, Err2, Elem, Done, Done1, Done2>(
  left: Fiber.Fiber<Err, Either.Either<Done, Elem>>,
  right: Fiber.Fiber<Err1, Either.Either<Done1, Elem>>
) => MergeState<Env, Err, Err1, Err2, Elem, Done, Done1, Done2>
```

Added in v1.0.0

## LeftDone

**Signature**

```ts
export declare const LeftDone: <Env, Err, Err1, Err2, Elem, Done, Done1, Done2>(
  f: (exit: Exit.Exit<Err1, Done1>) => Effect.Effect<Env, Err2, Done2>
) => MergeState<Env, Err, Err1, Err2, Elem, Done, Done1, Done2>
```

Added in v1.0.0

## RightDone

**Signature**

```ts
export declare const RightDone: <Env, Err, Err1, Err2, Elem, Done, Done1, Done2>(
  f: (exit: Exit.Exit<Err, Done>) => Effect.Effect<Env, Err2, Done2>
) => MergeState<Env, Err, Err1, Err2, Elem, Done, Done1, Done2>
```

Added in v1.0.0

# folding

## match

**Signature**

```ts
export declare const match: {
  <Env, Err, Err1, Err2, Elem, Done, Done1, Done2, Z>(options: {
    readonly onBothRunning: (
      left: Fiber.Fiber<Err, Either.Either<Done, Elem>>,
      right: Fiber.Fiber<Err1, Either.Either<Done1, Elem>>
    ) => Z
    readonly onLeftDone: (f: (exit: Exit.Exit<Err1, Done1>) => Effect.Effect<Env, Err2, Done2>) => Z
    readonly onRightDone: (f: (exit: Exit.Exit<Err, Done>) => Effect.Effect<Env, Err2, Done2>) => Z
  }): (self: MergeState<Env, Err, Err1, Err2, Elem, Done, Done1, Done2>) => Z
  <Env, Err, Err1, Err2, Elem, Done, Done1, Done2, Z>(
    self: MergeState<Env, Err, Err1, Err2, Elem, Done, Done1, Done2>,
    options: {
      readonly onBothRunning: (
        left: Fiber.Fiber<Err, Either.Either<Done, Elem>>,
        right: Fiber.Fiber<Err1, Either.Either<Done1, Elem>>
      ) => Z
      readonly onLeftDone: (f: (exit: Exit.Exit<Err1, Done1>) => Effect.Effect<Env, Err2, Done2>) => Z
      readonly onRightDone: (f: (exit: Exit.Exit<Err, Done>) => Effect.Effect<Env, Err2, Done2>) => Z
    }
  ): Z
}
```

Added in v1.0.0

# models

## BothRunning (interface)

**Signature**

```ts
export interface BothRunning<_Env, Err, Err1, _Err2, Elem, Done, Done1, _Done2> extends MergeState.Proto {
  readonly _tag: 'BothRunning'
  readonly left: Fiber.Fiber<Err, Either.Either<Done, Elem>>
  readonly right: Fiber.Fiber<Err1, Either.Either<Done1, Elem>>
}
```

Added in v1.0.0

## LeftDone (interface)

**Signature**

```ts
export interface LeftDone<Env, _Err, Err1, Err2, _Elem, _Done, Done1, Done2> extends MergeState.Proto {
  readonly _tag: 'LeftDone'
  readonly f: (exit: Exit.Exit<Err1, Done1>) => Effect.Effect<Env, Err2, Done2>
}
```

Added in v1.0.0

## MergeState (type alias)

**Signature**

```ts
export type MergeState<Env, Err, Err1, Err2, Elem, Done, Done1, Done2> =
  | BothRunning<Env, Err, Err1, Err2, Elem, Done, Done1, Done2>
  | LeftDone<Env, Err, Err1, Err2, Elem, Done, Done1, Done2>
  | RightDone<Env, Err, Err1, Err2, Elem, Done, Done1, Done2>
```

Added in v1.0.0

## RightDone (interface)

**Signature**

```ts
export interface RightDone<Env, Err, _Err1, Err2, _Elem, Done, _Done1, Done2> extends MergeState.Proto {
  readonly _tag: 'RightDone'
  readonly f: (exit: Exit.Exit<Err, Done>) => Effect.Effect<Env, Err2, Done2>
}
```

Added in v1.0.0

# refinements

## isBothRunning

Returns `true` if the specified `MergeState` is a `BothRunning`, `false`
otherwise.

**Signature**

```ts
export declare const isBothRunning: <Env, Err, Err1, Err2, Elem, Done, Done1, Done2>(
  self: MergeState<Env, Err, Err1, Err2, Elem, Done, Done1, Done2>
) => self is BothRunning<Env, Err, Err1, Err2, Elem, Done, Done1, Done2>
```

Added in v1.0.0

## isLeftDone

Returns `true` if the specified `MergeState` is a `LeftDone`, `false`
otherwise.

**Signature**

```ts
export declare const isLeftDone: <Env, Err, Err1, Err2, Elem, Done, Done1, Done2>(
  self: MergeState<Env, Err, Err1, Err2, Elem, Done, Done1, Done2>
) => self is LeftDone<Env, Err, Err1, Err2, Elem, Done, Done1, Done2>
```

Added in v1.0.0

## isMergeState

Returns `true` if the specified value is a `MergeState`, `false` otherwise.

**Signature**

```ts
export declare const isMergeState: (
  u: unknown
) => u is MergeState<unknown, unknown, unknown, unknown, unknown, unknown, unknown, unknown>
```

Added in v1.0.0

## isRightDone

Returns `true` if the specified `MergeState` is a `RightDone`, `false`
otherwise.

**Signature**

```ts
export declare const isRightDone: <Env, Err, Err1, Err2, Elem, Done, Done1, Done2>(
  self: MergeState<Env, Err, Err1, Err2, Elem, Done, Done1, Done2>
) => self is RightDone<Env, Err, Err1, Err2, Elem, Done, Done1, Done2>
```

Added in v1.0.0

# symbols

## MergeStateTypeId

**Signature**

```ts
export declare const MergeStateTypeId: typeof MergeStateTypeId
```

Added in v1.0.0

## MergeStateTypeId (type alias)

**Signature**

```ts
export type MergeStateTypeId = typeof MergeStateTypeId
```

Added in v1.0.0

# utils

## MergeState (namespace)

Added in v1.0.0

### Proto (interface)

**Signature**

```ts
export interface Proto {
  readonly [MergeStateTypeId]: MergeStateTypeId
}
```

Added in v1.0.0
