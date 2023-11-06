---
title: Symbol.ts
nav_order: 115
parent: Modules
---

## Symbol overview

Added in v2.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [guards](#guards)
  - [isSymbol](#issymbol)
- [instances](#instances)
  - [Equivalence](#equivalence)

---

# guards

## isSymbol

Tests if a value is a `symbol`.

**Signature**

```ts
export declare const isSymbol: (u: unknown) => u is symbol
```

**Example**

```ts
import { isSymbol } from "effect/Predicate"

assert.deepStrictEqual(isSymbol(Symbol.for("a")), true)
assert.deepStrictEqual(isSymbol("a"), false)
```

Added in v2.0.0

# instances

## Equivalence

**Signature**

```ts
export declare const Equivalence: equivalence.Equivalence<symbol>
```

Added in v2.0.0
