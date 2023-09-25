---
title: Unify.ts
nav_order: 103
parent: Modules
---

## Unify overview

Added in v1.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [utils](#utils)
  - [Unify (type alias)](#unify-type-alias)
  - [blacklistSymbol (type alias)](#blacklistsymbol-type-alias)
  - [typeSymbol (type alias)](#typesymbol-type-alias)
  - [unify](#unify)
  - [unifySymbol (type alias)](#unifysymbol-type-alias)

---

# utils

## Unify (type alias)

**Signature**

```ts
export type Unify<A> = Values<ExtractTypes<FilterIn<A> & { [typeSymbol]: A }>> extends infer Z
  ? Z | Exclude<A, Z> | FilterOut<A>
  : never
```

Added in v1.0.0

## blacklistSymbol (type alias)

**Signature**

```ts
export type blacklistSymbol = typeof blacklistSymbol
```

Added in v1.0.0

## typeSymbol (type alias)

**Signature**

```ts
export type typeSymbol = typeof typeSymbol
```

Added in v1.0.0

## unify

**Signature**

```ts
export declare const unify: {
  <Args extends any[], Args2 extends any[], Args3 extends any[], Args4 extends any[], Args5 extends any[], T>(
    x: (...args: Args) => (...args: Args2) => (...args: Args3) => (...args: Args4) => (...args: Args5) => T
  ): (...args: Args) => (...args: Args2) => (...args: Args3) => (...args: Args4) => (...args: Args5) => Unify<T>
  <Args extends any[], Args2 extends any[], Args3 extends any[], Args4 extends any[], T>(
    x: (...args: Args) => (...args: Args2) => (...args: Args3) => (...args: Args4) => T
  ): (...args: Args) => (...args: Args2) => (...args: Args3) => (...args: Args4) => Unify<T>
  <Args extends any[], Args2 extends any[], Args3 extends any[], T>(
    x: (...args: Args) => (...args: Args2) => (...args: Args3) => T
  ): (...args: Args) => (...args: Args2) => (...args: Args3) => Unify<T>
  <Args extends any[], Args2 extends any[], T>(x: (...args: Args) => (...args: Args2) => T): (
    ...args: Args
  ) => (...args: Args2) => Unify<T>
  <Args extends any[], T>(x: (...args: Args) => T): (...args: Args) => Unify<T>
  <T>(x: T): Unify<T>
}
```

Added in v1.0.0

## unifySymbol (type alias)

**Signature**

```ts
export type unifySymbol = typeof unifySymbol
```

Added in v1.0.0
