---
title: LogSpan.ts
nav_order: 48
parent: Modules
---

## LogSpan overview

Added in v1.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [constructors](#constructors)
  - [make](#make)
- [destructors](#destructors)
  - [render](#render)
- [models](#models)
  - [LogSpan (interface)](#logspan-interface)

---

# constructors

## make

**Signature**

```ts
export declare const make: (label: string, startTime: number) => LogSpan
```

Added in v1.0.0

# destructors

## render

**Signature**

```ts
export declare const render: (now: number) => (self: LogSpan) => string
```

Added in v1.0.0

# models

## LogSpan (interface)

**Signature**

```ts
export interface LogSpan {
  readonly label: string
  readonly startTime: number
}
```

Added in v1.0.0
