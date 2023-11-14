---
title: Hash.ts
nav_order: 40
parent: Modules
---

## Hash overview

Added in v2.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [guards](#guards)
  - [isHash](#ishash)
- [hashing](#hashing)
  - [array](#array)
  - [combine](#combine)
  - [hash](#hash)
  - [number](#number)
  - [optimize](#optimize)
  - [random](#random)
  - [string](#string)
  - [structure](#structure)
  - [structureKeys](#structurekeys)
- [models](#models)
  - [Hash (interface)](#hash-interface)
- [symbols](#symbols)
  - [symbol](#symbol)

---

# guards

## isHash

**Signature**

```ts
export declare const isHash: (u: unknown) => u is Hash
```

Added in v2.0.0

# hashing

## array

**Signature**

```ts
export declare const array: <A>(arr: readonly A[]) => number
```

Added in v2.0.0

## combine

**Signature**

```ts
export declare const combine: (b: number) => (self: number) => number
```

Added in v2.0.0

## hash

**Signature**

```ts
export declare const hash: <A>(self: A) => number
```

Added in v2.0.0

## number

**Signature**

```ts
export declare const number: (n: number) => number
```

Added in v2.0.0

## optimize

**Signature**

```ts
export declare const optimize: (n: number) => number
```

Added in v2.0.0

## random

**Signature**

```ts
export declare const random: <A extends object>(self: A) => number
```

Added in v2.0.0

## string

**Signature**

```ts
export declare const string: (str: string) => number
```

Added in v2.0.0

## structure

**Signature**

```ts
export declare const structure: <A extends object>(o: A) => number
```

Added in v2.0.0

## structureKeys

**Signature**

```ts
export declare const structureKeys: <A extends object>(o: A, keys: readonly (keyof A)[]) => number
```

Added in v2.0.0

# models

## Hash (interface)

**Signature**

```ts
export interface Hash {
  readonly [symbol]: () => number
}
```

Added in v2.0.0

# symbols

## symbol

**Signature**

```ts
export declare const symbol: typeof symbol
```

Added in v2.0.0
