---
title: Random.ts
nav_order: 81
parent: Modules
---

## Random overview

Added in v2.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [constructors](#constructors)
  - [next](#next)
  - [nextBoolean](#nextboolean)
  - [nextInt](#nextint)
  - [nextIntBetween](#nextintbetween)
  - [nextRange](#nextrange)
  - [randomWith](#randomwith)
  - [shuffle](#shuffle)
- [models](#models)
  - [Random (interface)](#random-interface)
- [symbols](#symbols)
  - [RandomTypeId](#randomtypeid)
  - [RandomTypeId (type alias)](#randomtypeid-type-alias)

---

# constructors

## next

Returns the next numeric value from the pseudo-random number generator.

**Signature**

```ts
export declare const next: Effect.Effect<never, never, number>
```

Added in v2.0.0

## nextBoolean

Returns the next boolean value from the pseudo-random number generator.

**Signature**

```ts
export declare const nextBoolean: Effect.Effect<never, never, boolean>
```

Added in v2.0.0

## nextInt

Returns the next integer value from the pseudo-random number generator.

**Signature**

```ts
export declare const nextInt: Effect.Effect<never, never, number>
```

Added in v2.0.0

## nextIntBetween

Returns the next integer value in the specified range from the
pseudo-random number generator.

**Signature**

```ts
export declare const nextIntBetween: (min: number, max: number) => Effect.Effect<never, never, number>
```

Added in v2.0.0

## nextRange

Returns the next numeric value in the specified range from the
pseudo-random number generator.

**Signature**

```ts
export declare const nextRange: (min: number, max: number) => Effect.Effect<never, never, number>
```

Added in v2.0.0

## randomWith

Retreives the `Random` service from the context and uses it to run the
specified workflow.

**Signature**

```ts
export declare const randomWith: <R, E, A>(f: (random: Random) => Effect.Effect<R, E, A>) => Effect.Effect<R, E, A>
```

Added in v2.0.0

## shuffle

Uses the pseudo-random number generator to shuffle the specified iterable.

**Signature**

```ts
export declare const shuffle: <A>(elements: Iterable<A>) => Effect.Effect<never, never, Chunk.Chunk<A>>
```

Added in v2.0.0

# models

## Random (interface)

**Signature**

```ts
export interface Random {
  readonly [RandomTypeId]: RandomTypeId
  /**
   * Returns the next numeric value from the pseudo-random number generator.
   */
  readonly next: Effect.Effect<never, never, number>
  /**
   * Returns the next boolean value from the pseudo-random number generator.
   */
  readonly nextBoolean: Effect.Effect<never, never, boolean>
  /**
   * Returns the next integer value from the pseudo-random number generator.
   */
  readonly nextInt: Effect.Effect<never, never, number>
  /**
   * Returns the next numeric value in the specified range from the
   * pseudo-random number generator.
   */
  readonly nextRange: (min: number, max: number) => Effect.Effect<never, never, number>
  /**
   * Returns the next integer value in the specified range from the
   * pseudo-random number generator.
   */
  readonly nextIntBetween: (min: number, max: number) => Effect.Effect<never, never, number>
  /**
   * Uses the pseudo-random number generator to shuffle the specified iterable.
   */
  readonly shuffle: <A>(elements: Iterable<A>) => Effect.Effect<never, never, Chunk.Chunk<A>>
}
```

Added in v2.0.0

# symbols

## RandomTypeId

**Signature**

```ts
export declare const RandomTypeId: typeof RandomTypeId
```

Added in v2.0.0

## RandomTypeId (type alias)

**Signature**

```ts
export type RandomTypeId = typeof RandomTypeId
```

Added in v2.0.0
