---
title: MetricPair.ts
nav_order: 62
parent: Modules
---

## MetricPair overview

Added in v2.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [constructors](#constructors)
  - [make](#make)
- [model](#model)
  - [MetricPair (interface)](#metricpair-interface)
- [symbols](#symbols)
  - [MetricPairTypeId](#metricpairtypeid)
  - [MetricPairTypeId (type alias)](#metricpairtypeid-type-alias)
- [unsafe](#unsafe)
  - [unsafeMake](#unsafemake)
- [utils](#utils)
  - [MetricPair (namespace)](#metricpair-namespace)
    - [Untyped (interface)](#untyped-interface)
    - [Variance (interface)](#variance-interface)

---

# constructors

## make

**Signature**

```ts
export declare const make: <Type extends MetricKeyType.MetricKeyType<any, any>>(
  metricKey: MetricKey.MetricKey<Type>,
  metricState: MetricState.MetricState<MetricKeyType.MetricKeyType.OutType<Type>>,
) => MetricPair.Untyped
```

Added in v2.0.0

# model

## MetricPair (interface)

**Signature**

```ts
export interface MetricPair<Type extends MetricKeyType.MetricKeyType<any, any>>
  extends MetricPair.Variance<Type>,
    Pipeable {
  readonly metricKey: MetricKey.MetricKey<Type>
  readonly metricState: MetricState.MetricState<MetricKeyType.MetricKeyType.OutType<Type>>
}
```

Added in v2.0.0

# symbols

## MetricPairTypeId

**Signature**

```ts
export declare const MetricPairTypeId: typeof MetricPairTypeId
```

Added in v2.0.0

## MetricPairTypeId (type alias)

**Signature**

```ts
export type MetricPairTypeId = typeof MetricPairTypeId
```

Added in v2.0.0

# unsafe

## unsafeMake

**Signature**

```ts
export declare const unsafeMake: <Type extends MetricKeyType.MetricKeyType<any, any>>(
  metricKey: MetricKey.MetricKey<Type>,
  metricState: MetricState.MetricState.Untyped,
) => MetricPair.Untyped
```

Added in v2.0.0

# utils

## MetricPair (namespace)

Added in v2.0.0

### Untyped (interface)

**Signature**

```ts
export interface Untyped extends MetricPair<MetricKeyType.MetricKeyType<any, any>> {}
```

Added in v2.0.0

### Variance (interface)

**Signature**

```ts
export interface Variance<Type extends MetricKeyType.MetricKeyType<any, any>> {
  readonly [MetricPairTypeId]: {
    readonly _Type: (_: never) => Type
  }
}
```

Added in v2.0.0
