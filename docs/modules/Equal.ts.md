---
title: Equal.ts
nav_order: 32
parent: Modules
---

## Equal overview

Added in v2.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [equality](#equality)
  - [equals](#equals)
- [guards](#guards)
  - [isEqual](#isequal)
- [instances](#instances)
  - [equivalence](#equivalence)
- [models](#models)
  - [Equal (interface)](#equal-interface)
- [symbols](#symbols)
  - [symbol](#symbol)

---

# equality

## equals

**Signature**

```ts
export declare function equals<B>(that: B): <A>(self: A) => boolean
export declare function equals<A, B>(self: A, that: B): boolean
```

Added in v2.0.0

# guards

## isEqual

**Signature**

```ts
export declare const isEqual: (u: unknown) => u is Equal
```

Added in v2.0.0

# instances

## equivalence

**Signature**

```ts
export declare const equivalence: <A>() => Equivalence<A>
```

Added in v2.0.0

# models

## Equal (interface)

**Signature**

```ts
export interface Equal extends Hash.Hash {
  [symbol](that: Equal): boolean
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
