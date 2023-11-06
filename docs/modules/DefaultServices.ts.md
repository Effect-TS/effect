---
title: DefaultServices.ts
nav_order: 19
parent: Modules
---

## DefaultServices overview

Added in v2.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [constructors](#constructors)
  - [liveServices](#liveservices)
- [fiberRefs](#fiberrefs)
  - [currentServices](#currentservices)
- [models](#models)
  - [DefaultServices (type alias)](#defaultservices-type-alias)

---

# constructors

## liveServices

**Signature**

```ts
export declare const liveServices: Context<DefaultServices>
```

Added in v2.0.0

# fiberRefs

## currentServices

**Signature**

```ts
export declare const currentServices: FiberRef<Context<DefaultServices>>
```

Added in v2.0.0

# models

## DefaultServices (type alias)

**Signature**

```ts
export type DefaultServices =
  | Clock.Clock
  | Console.Console
  | Random.Random
  | ConfigProvider.ConfigProvider
  | Tracer.Tracer
```

Added in v2.0.0
