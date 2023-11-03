---
title: Utils.ts
nav_order: 144
parent: Modules
---

## Utils overview

Added in v2.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [adapters](#adapters)
  - [adapter](#adapter)
- [constructors](#constructors)
  - [GenKindImpl (class)](#genkindimpl-class)
    - [[Symbol.iterator] (method)](#symboliterator-method)
    - [[GenKindTypeId] (property)](#genkindtypeid-property)
  - [SingleShotGen (class)](#singleshotgen-class)
    - [next (method)](#next-method)
    - [return (method)](#return-method)
    - [throw (method)](#throw-method)
    - [[Symbol.iterator] (method)](#symboliterator-method-1)
  - [makeGenKind](#makegenkind)
- [model](#model)
  - [OptionalNumber (type alias)](#optionalnumber-type-alias)
  - [PCGRandom (class)](#pcgrandom-class)
    - [getState (method)](#getstate-method)
    - [setState (method)](#setstate-method)
    - [integer (method)](#integer-method)
    - [number (method)](#number-method)
  - [PCGRandomState (type alias)](#pcgrandomstate-type-alias)
- [models](#models)
  - [Adapter (interface)](#adapter-interface)
  - [Gen (interface)](#gen-interface)
  - [GenKind (interface)](#genkind-interface)
  - [Variance (interface)](#variance-interface)
- [symbols](#symbols)
  - [GenKindTypeId](#genkindtypeid)
  - [GenKindTypeId (type alias)](#genkindtypeid-type-alias)

---

# adapters

## adapter

**Signature**

```ts
export declare const adapter: <F extends TypeLambda>() => Adapter<F>
```

Added in v2.0.0

# constructors

## GenKindImpl (class)

**Signature**

```ts
export declare class GenKindImpl<F, R, O, E, A> { constructor(
    /**
     * @since 2.0.0
     */
    readonly value: Kind<F, R, O, E, A>
  ) }
```

Added in v2.0.0

### [Symbol.iterator] (method)

**Signature**

```ts
[Symbol.iterator](): Generator<GenKind<F, R, O, E, A>, A>
```

Added in v2.0.0

### [GenKindTypeId] (property)

**Signature**

```ts
readonly [GenKindTypeId]: typeof GenKindTypeId
```

Added in v2.0.0

## SingleShotGen (class)

**Signature**

```ts
export declare class SingleShotGen<T, A> { constructor(readonly self: T) }
```

Added in v2.0.0

### next (method)

**Signature**

```ts
next(a: A): IteratorResult<T, A>
```

Added in v2.0.0

### return (method)

**Signature**

```ts
return(a: A): IteratorResult<T, A>
```

Added in v2.0.0

### throw (method)

**Signature**

```ts
throw(e: unknown): IteratorResult<T, A>
```

Added in v2.0.0

### [Symbol.iterator] (method)

**Signature**

```ts
[Symbol.iterator](): Generator<T, A>
```

Added in v2.0.0

## makeGenKind

**Signature**

```ts
export declare const makeGenKind: <F extends TypeLambda, R, O, E, A>(
  kind: Kind<F, R, O, E, A>,
) => GenKind<F, R, O, E, A>
```

Added in v2.0.0

# model

## OptionalNumber (type alias)

**Signature**

```ts
export type OptionalNumber = number | null | undefined
```

Added in v2.0.0

## PCGRandom (class)

PCG is a family of simple fast space-efficient statistically good algorithms
for random number generation. Unlike many general-purpose RNGs, they are also
hard to predict.

**Signature**

```ts
export declare class PCGRandom {
  constructor(seedHi?: OptionalNumber, seedLo?: OptionalNumber, incHi?: OptionalNumber, incLo?: OptionalNumber)
}
```

Added in v2.0.0

### getState (method)

Returns a copy of the internal state of this random number generator as a
JavaScript Array.

**Signature**

```ts
getState(): PCGRandomState
```

Added in v2.0.0

### setState (method)

Restore state previously retrieved using `getState()`.

**Signature**

```ts
setState(state: PCGRandomState)
```

Added in v2.0.0

### integer (method)

Get a uniformly distributed 32 bit integer between [0, max).

**Signature**

```ts
integer(max: number)
```

Added in v2.0.0

### number (method)

Get a uniformly distributed IEEE-754 double between 0.0 and 1.0, with
53 bits of precision (every bit of the mantissa is randomized).

**Signature**

```ts
number()
```

Added in v2.0.0

## PCGRandomState (type alias)

**Signature**

```ts
export type PCGRandomState = [number, number, number, number]
```

Added in v2.0.0

# models

## Adapter (interface)

**Signature**

```ts
export interface Adapter<Z extends TypeLambda> {
  <_R, _O, _E, _A>(self: Kind<Z, _R, _O, _E, _A>): GenKind<Z, _R, _O, _E, _A>
  <A, _R, _O, _E, _A>(a: A, ab: (a: A) => Kind<Z, _R, _O, _E, _A>): GenKind<Z, _R, _O, _E, _A>
  <A, B, _R, _O, _E, _A>(a: A, ab: (a: A) => B, bc: (b: B) => Kind<Z, _R, _O, _E, _A>): GenKind<Z, _R, _O, _E, _A>
  <A, B, C, _R, _O, _E, _A>(
    a: A,
    ab: (a: A) => B,
    bc: (b: B) => C,
    cd: (c: C) => Kind<Z, _R, _O, _E, _A>,
  ): GenKind<Z, _R, _O, _E, _A>
  <A, B, C, D, _R, _O, _E, _A>(
    a: A,
    ab: (a: A) => B,
    bc: (b: B) => C,
    cd: (c: C) => D,
    de: (d: D) => Kind<Z, _R, _O, _E, _A>,
  ): GenKind<Z, _R, _O, _E, _A>
  <A, B, C, D, E, _R, _O, _E, _A>(
    a: A,
    ab: (a: A) => B,
    bc: (b: B) => C,
    cd: (c: C) => D,
    de: (d: D) => E,
    ef: (e: E) => Kind<Z, _R, _O, _E, _A>,
  ): GenKind<Z, _R, _O, _E, _A>
  <A, B, C, D, E, F, _R, _O, _E, _A>(
    a: A,
    ab: (a: A) => B,
    bc: (b: B) => C,
    cd: (c: C) => D,
    de: (d: D) => E,
    ef: (e: E) => F,
    fg: (f: F) => Kind<Z, _R, _O, _E, _A>,
  ): GenKind<Z, _R, _O, _E, _A>
  <A, B, C, D, E, F, G, _R, _O, _E, _A>(
    a: A,
    ab: (a: A) => B,
    bc: (b: B) => C,
    cd: (c: C) => D,
    de: (d: D) => E,
    ef: (e: E) => F,
    fg: (f: F) => G,
    gh: (g: F) => Kind<Z, _R, _O, _E, _A>,
  ): GenKind<Z, _R, _O, _E, _A>
  <A, B, C, D, E, F, G, H, _R, _O, _E, _A>(
    a: A,
    ab: (a: A) => B,
    bc: (b: B) => C,
    cd: (c: C) => D,
    de: (d: D) => E,
    ef: (e: E) => F,
    fg: (f: F) => G,
    gh: (g: G) => H,
    hi: (g: H) => Kind<Z, _R, _O, _E, _A>,
  ): GenKind<Z, _R, _O, _E, _A>
  <A, B, C, D, E, F, G, H, I, _R, _O, _E, _A>(
    a: A,
    ab: (a: A) => B,
    bc: (b: B) => C,
    cd: (c: C) => D,
    de: (d: D) => E,
    ef: (e: E) => F,
    fg: (f: F) => G,
    gh: (g: G) => H,
    hi: (h: H) => I,
    ij: (i: I) => Kind<Z, _R, _O, _E, _A>,
  ): GenKind<Z, _R, _O, _E, _A>
  <A, B, C, D, E, F, G, H, I, J, _R, _O, _E, _A>(
    a: A,
    ab: (a: A) => B,
    bc: (b: B) => C,
    cd: (c: C) => D,
    de: (d: D) => E,
    ef: (e: E) => F,
    fg: (f: F) => G,
    gh: (g: G) => H,
    hi: (h: H) => I,
    ij: (i: I) => J,
    jk: (j: J) => Kind<Z, _R, _O, _E, _A>,
  ): GenKind<Z, _R, _O, _E, _A>
  <A, B, C, D, E, F, G, H, I, J, K, _R, _O, _E, _A>(
    a: A,
    ab: (a: A) => B,
    bc: (b: B) => C,
    cd: (c: C) => D,
    de: (d: D) => E,
    ef: (e: E) => F,
    fg: (f: F) => G,
    gh: (g: G) => H,
    hi: (h: H) => I,
    ij: (i: I) => J,
    jk: (j: J) => K,
    kl: (k: K) => Kind<Z, _R, _O, _E, _A>,
  ): GenKind<Z, _R, _O, _E, _A>
  <A, B, C, D, E, F, G, H, I, J, K, L, _R, _O, _E, _A>(
    a: A,
    ab: (a: A) => B,
    bc: (b: B) => C,
    cd: (c: C) => D,
    de: (d: D) => E,
    ef: (e: E) => F,
    fg: (f: F) => G,
    gh: (g: G) => H,
    hi: (h: H) => I,
    ij: (i: I) => J,
    jk: (j: J) => K,
    kl: (k: K) => L,
    lm: (l: L) => Kind<Z, _R, _O, _E, _A>,
  ): GenKind<Z, _R, _O, _E, _A>
  <A, B, C, D, E, F, G, H, I, J, K, L, M, _R, _O, _E, _A>(
    a: A,
    ab: (a: A) => B,
    bc: (b: B) => C,
    cd: (c: C) => D,
    de: (d: D) => E,
    ef: (e: E) => F,
    fg: (f: F) => G,
    gh: (g: G) => H,
    hi: (h: H) => I,
    ij: (i: I) => J,
    jk: (j: J) => K,
    kl: (k: K) => L,
    lm: (l: L) => M,
    mn: (m: M) => Kind<Z, _R, _O, _E, _A>,
  ): GenKind<Z, _R, _O, _E, _A>
  <A, B, C, D, E, F, G, H, I, J, K, L, M, N, _R, _O, _E, _A>(
    a: A,
    ab: (a: A) => B,
    bc: (b: B) => C,
    cd: (c: C) => D,
    de: (d: D) => E,
    ef: (e: E) => F,
    fg: (f: F) => G,
    gh: (g: G) => H,
    hi: (h: H) => I,
    ij: (i: I) => J,
    jk: (j: J) => K,
    kl: (k: K) => L,
    lm: (l: L) => M,
    mn: (m: M) => N,
    no: (n: N) => Kind<Z, _R, _O, _E, _A>,
  ): GenKind<Z, _R, _O, _E, _A>
  <A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, _R, _O, _E, _A>(
    a: A,
    ab: (a: A) => B,
    bc: (b: B) => C,
    cd: (c: C) => D,
    de: (d: D) => E,
    ef: (e: E) => F,
    fg: (f: F) => G,
    gh: (g: G) => H,
    hi: (h: H) => I,
    ij: (i: I) => J,
    jk: (j: J) => K,
    kl: (k: K) => L,
    lm: (l: L) => M,
    mn: (m: M) => N,
    no: (n: N) => O,
    op: (o: O) => Kind<Z, _R, _O, _E, _A>,
  ): GenKind<Z, _R, _O, _E, _A>
  <A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, _R, _O, _E, _A>(
    a: A,
    ab: (a: A) => B,
    bc: (b: B) => C,
    cd: (c: C) => D,
    de: (d: D) => E,
    ef: (e: E) => F,
    fg: (f: F) => G,
    gh: (g: G) => H,
    hi: (h: H) => I,
    ij: (i: I) => J,
    jk: (j: J) => K,
    kl: (k: K) => L,
    lm: (l: L) => M,
    mn: (m: M) => N,
    no: (n: N) => O,
    op: (o: O) => P,
    pq: (p: P) => Kind<Z, _R, _O, _E, _A>,
  ): GenKind<Z, _R, _O, _E, _A>
  <A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, _R, _O, _E, _A>(
    a: A,
    ab: (a: A) => B,
    bc: (b: B) => C,
    cd: (c: C) => D,
    de: (d: D) => E,
    ef: (e: E) => F,
    fg: (f: F) => G,
    gh: (g: G) => H,
    hi: (h: H) => I,
    ij: (i: I) => J,
    jk: (j: J) => K,
    kl: (k: K) => L,
    lm: (l: L) => M,
    mn: (m: M) => N,
    no: (n: N) => O,
    op: (o: O) => P,
    pq: (p: P) => Q,
    qr: (q: Q) => Kind<Z, _R, _O, _E, _A>,
  ): GenKind<Z, _R, _O, _E, _A>
  <A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, _R, _O, _E, _A>(
    a: A,
    ab: (a: A) => B,
    bc: (b: B) => C,
    cd: (c: C) => D,
    de: (d: D) => E,
    ef: (e: E) => F,
    fg: (f: F) => G,
    gh: (g: G) => H,
    hi: (h: H) => I,
    ij: (i: I) => J,
    jk: (j: J) => K,
    kl: (k: K) => L,
    lm: (l: L) => M,
    mn: (m: M) => N,
    no: (n: N) => O,
    op: (o: O) => P,
    pq: (p: P) => Q,
    qr: (q: Q) => R,
    rs: (r: R) => Kind<Z, _R, _O, _E, _A>,
  ): GenKind<Z, _R, _O, _E, _A>
  <A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S, _R, _O, _E, _A>(
    a: A,
    ab: (a: A) => B,
    bc: (b: B) => C,
    cd: (c: C) => D,
    de: (d: D) => E,
    ef: (e: E) => F,
    fg: (f: F) => G,
    gh: (g: G) => H,
    hi: (h: H) => I,
    ij: (i: I) => J,
    jk: (j: J) => K,
    kl: (k: K) => L,
    lm: (l: L) => M,
    mn: (m: M) => N,
    no: (n: N) => O,
    op: (o: O) => P,
    pq: (p: P) => Q,
    qr: (q: Q) => R,
    rs: (r: R) => S,
    st: (s: S) => Kind<Z, _R, _O, _E, _A>,
  ): GenKind<Z, _R, _O, _E, _A>
  <A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S, T, _R, _O, _E, _A>(
    a: A,
    ab: (a: A) => B,
    bc: (b: B) => C,
    cd: (c: C) => D,
    de: (d: D) => E,
    ef: (e: E) => F,
    fg: (f: F) => G,
    gh: (g: G) => H,
    hi: (h: H) => I,
    ij: (i: I) => J,
    jk: (j: J) => K,
    kl: (k: K) => L,
    lm: (l: L) => M,
    mn: (m: M) => N,
    no: (n: N) => O,
    op: (o: O) => P,
    pq: (p: P) => Q,
    qr: (q: Q) => R,
    rs: (r: R) => S,
    st: (s: S) => T,
    tu: (s: T) => Kind<Z, _R, _O, _E, _A>,
  ): GenKind<Z, _R, _O, _E, _A>
}
```

Added in v2.0.0

## Gen (interface)

**Signature**

```ts
export interface Gen<F extends TypeLambda, Z> {
  <K extends Variance<F, any, any, any>, A>(
    body: (resume: Z) => Generator<K, A>,
  ): Kind<
    F,
    [K] extends [Variance<F, infer R, any, any>] ? R : never,
    [K] extends [Variance<F, any, infer O, any>] ? O : never,
    [K] extends [Variance<F, any, any, infer E>] ? E : never,
    A
  >
}
```

Added in v2.0.0

## GenKind (interface)

**Signature**

```ts
export interface GenKind<F extends TypeLambda, R, O, E, A> extends Variance<F, R, O, E> {
  readonly value: Kind<F, R, O, E, A>

  [Symbol.iterator](): Generator<GenKind<F, R, O, E, A>, A>
}
```

Added in v2.0.0

## Variance (interface)

**Signature**

```ts
export interface Variance<F extends TypeLambda, R, O, E> {
  readonly [GenKindTypeId]: GenKindTypeId
  readonly _F: (_: F) => F
  readonly _R: (_: R) => unknown
  readonly _O: (_: never) => O
  readonly _E: (_: never) => E
}
```

Added in v2.0.0

# symbols

## GenKindTypeId

**Signature**

```ts
export declare const GenKindTypeId: typeof GenKindTypeId
```

Added in v2.0.0

## GenKindTypeId (type alias)

**Signature**

```ts
export type GenKindTypeId = typeof GenKindTypeId
```

Added in v2.0.0
