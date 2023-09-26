---
title: TRandom.ts
nav_order: 117
parent: Modules
---

## TRandom overview

Added in v1.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [context](#context)
  - [Tag](#tag)
  - [live](#live)
- [models](#models)
  - [TRandom (interface)](#trandom-interface)
- [random](#random)
  - [next](#next)
  - [nextBoolean](#nextboolean)
  - [nextInt](#nextint)
  - [nextIntBetween](#nextintbetween)
  - [nextRange](#nextrange)
  - [shuffle](#shuffle)
- [symbols](#symbols)
  - [TRandomTypeId](#trandomtypeid)
  - [TRandomTypeId (type alias)](#trandomtypeid-type-alias)

---

# context

## Tag

The service tag used to access `TRandom` in the environment of an effect.

**Signature**

```ts
export declare const Tag: Context.Tag<TRandom, TRandom>
```

Added in v1.0.0

## live

The "live" `TRandom` service wrapped into a `Layer`.

**Signature**

```ts
export declare const live: Layer.Layer<never, never, TRandom>
```

Added in v1.0.0

# models

## TRandom (interface)

**Signature**

```ts
export interface TRandom {
  readonly [TRandomTypeId]: TRandomTypeId
  /**
   * Returns the next numeric value from the pseudo-random number generator.
   */
  readonly next: STM.STM<never, never, number>
  /**
   * Returns the next boolean value from the pseudo-random number generator.
   */
  readonly nextBoolean: STM.STM<never, never, boolean>
  /**
   * Returns the next integer value from the pseudo-random number generator.
   */
  readonly nextInt: STM.STM<never, never, number>
  /**
   * Returns the next numeric value in the specified range from the
   * pseudo-random number generator.
   */
  nextRange(min: number, max: number): STM.STM<never, never, number>
  /**
   * Returns the next integer value in the specified range from the
   * pseudo-random number generator.
   */
  nextIntBetween(min: number, max: number): STM.STM<never, never, number>
  /**
   * Uses the pseudo-random number generator to shuffle the specified iterable.
   */
  shuffle<A>(elements: Iterable<A>): STM.STM<never, never, Array<A>>
}
```

Added in v1.0.0

# random

## next

Returns the next number from the pseudo-random number generator.

**Signature**

```ts
export declare const next: STM.STM<TRandom, never, number>
```

Added in v1.0.0

## nextBoolean

Returns the next boolean value from the pseudo-random number generator.

**Signature**

```ts
export declare const nextBoolean: STM.STM<TRandom, never, boolean>
```

Added in v1.0.0

## nextInt

Returns the next integer from the pseudo-random number generator.

**Signature**

```ts
export declare const nextInt: STM.STM<TRandom, never, number>
```

Added in v1.0.0

## nextIntBetween

Returns the next integer in the specified range from the pseudo-random number
generator.

**Signature**

```ts
export declare const nextIntBetween: (low: number, high: number) => STM.STM<TRandom, never, number>
```

Added in v1.0.0

## nextRange

Returns the next number in the specified range from the pseudo-random number
generator.

**Signature**

```ts
export declare const nextRange: (min: number, max: number) => STM.STM<TRandom, never, number>
```

Added in v1.0.0

## shuffle

Uses the pseudo-random number generator to shuffle the specified iterable.

**Signature**

```ts
export declare const shuffle: <A>(elements: Iterable<A>) => STM.STM<TRandom, never, A[]>
```

Added in v1.0.0

# symbols

## TRandomTypeId

**Signature**

```ts
export declare const TRandomTypeId: typeof TRandomTypeId
```

Added in v1.0.0

## TRandomTypeId (type alias)

**Signature**

```ts
export type TRandomTypeId = typeof TRandomTypeId
```

Added in v1.0.0
