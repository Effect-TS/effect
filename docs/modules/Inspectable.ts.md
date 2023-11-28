---
title: Inspectable.ts
nav_order: 45
parent: Modules
---

## Inspectable overview

Added in v2.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [models](#models)
  - [Inspectable (interface)](#inspectable-interface)
- [symbols](#symbols)
  - [NodeInspectSymbol](#nodeinspectsymbol)
  - [NodeInspectSymbol (type alias)](#nodeinspectsymbol-type-alias)
- [utils](#utils)
  - [toJSON](#tojson)

---

# models

## Inspectable (interface)

**Signature**

```ts
export interface Inspectable {
  toString(): string
  toJSON(): unknown
  [NodeInspectSymbol](): unknown
}
```

Added in v2.0.0

# symbols

## NodeInspectSymbol

**Signature**

```ts
export declare const NodeInspectSymbol: typeof NodeInspectSymbol
```

Added in v2.0.0

## NodeInspectSymbol (type alias)

**Signature**

```ts
export type NodeInspectSymbol = typeof NodeInspectSymbol
```

Added in v2.0.0

# utils

## toJSON

**Signature**

```ts
export declare const toJSON: (x: unknown) => unknown
```

Added in v2.0.0
