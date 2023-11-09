---
title: StreamHaltStrategy.ts
nav_order: 110
parent: Modules
---

## StreamHaltStrategy overview

Added in v2.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [constructors](#constructors)
  - [Both](#both)
  - [Either](#either)
  - [Left](#left)
  - [Right](#right)
  - [fromInput](#frominput)
- [folding](#folding)
  - [match](#match)
- [models](#models)
  - [Both (interface)](#both-interface)
  - [Either (interface)](#either-interface)
  - [StreamHaltStrategy (type alias)](#haltstrategy-type-alias)
  - [HaltStrategyInput (type alias)](#haltstrategyinput-type-alias)
  - [Left (interface)](#left-interface)
  - [Right (interface)](#right-interface)
- [refinements](#refinements)
  - [isBoth](#isboth)
  - [isEither](#iseither)
  - [isLeft](#isleft)
  - [isRight](#isright)

---

# constructors

## Both

**Signature**

```ts
export declare const Both: StreamHaltStrategy
```

Added in v2.0.0

## Either

**Signature**

```ts
export declare const Either: StreamHaltStrategy
```

Added in v2.0.0

## Left

**Signature**

```ts
export declare const Left: StreamHaltStrategy
```

Added in v2.0.0

## Right

**Signature**

```ts
export declare const Right: StreamHaltStrategy
```

Added in v2.0.0

## fromInput

**Signature**

```ts
export declare const fromInput: (input: HaltStrategyInput) => StreamHaltStrategy
```

Added in v2.0.0

# folding

## match

**Signature**

```ts
export declare const match: {
  <Z>(onLeft: () => Z, onRight: () => Z, onBoth: () => Z, onEither: () => Z): (self: StreamHaltStrategy) => Z
  <Z>(self: StreamHaltStrategy, onLeft: () => Z, onRight: () => Z, onBoth: () => Z, onEither: () => Z): Z
}
```

Added in v2.0.0

# models

## Both (interface)

**Signature**

```ts
export interface Both {
  readonly _tag: "Both"
}
```

Added in v2.0.0

## Either (interface)

**Signature**

```ts
export interface Either {
  readonly _tag: "Either"
}
```

Added in v2.0.0

## StreamHaltStrategy (type alias)

**Signature**

```ts
export type StreamHaltStrategy = Left | Right | Both | Either
```

Added in v2.0.0

## HaltStrategyInput (type alias)

**Signature**

```ts
export type HaltStrategyInput = StreamHaltStrategy | "left" | "right" | "both" | "either"
```

Added in v2.0.0

## Left (interface)

**Signature**

```ts
export interface Left {
  readonly _tag: "Left"
}
```

Added in v2.0.0

## Right (interface)

**Signature**

```ts
export interface Right {
  readonly _tag: "Right"
}
```

Added in v2.0.0

# refinements

## isBoth

**Signature**

```ts
export declare const isBoth: (self: StreamHaltStrategy) => self is Both
```

Added in v2.0.0

## isEither

**Signature**

```ts
export declare const isEither: (self: StreamHaltStrategy) => self is Either
```

Added in v2.0.0

## isLeft

**Signature**

```ts
export declare const isLeft: (self: StreamHaltStrategy) => self is Left
```

Added in v2.0.0

## isRight

**Signature**

```ts
export declare const isRight: (self: StreamHaltStrategy) => self is Right
```

Added in v2.0.0
