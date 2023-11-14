---
title: MetricRegistry.ts
nav_order: 64
parent: Modules
---

## MetricRegistry overview

Added in v2.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [constructors](#constructors)
  - [make](#make)
- [models](#models)
  - [MetricRegistry (interface)](#metricregistry-interface)
- [symbols](#symbols)
  - [MetricRegistryTypeId](#metricregistrytypeid)
  - [MetricRegistryTypeId (type alias)](#metricregistrytypeid-type-alias)

---

# constructors

## make

**Signature**

```ts
export declare const make: (_: void) => MetricRegistry
```

Added in v2.0.0

# models

## MetricRegistry (interface)

**Signature**

```ts
export interface MetricRegistry {
  readonly [MetricRegistryTypeId]: MetricRegistryTypeId
  readonly snapshot: () => HashSet.HashSet<MetricPair.MetricPair.Untyped>
  readonly get: <Type extends MetricKeyType.MetricKeyType<any, any>>(
    key: MetricKey.MetricKey<Type>
  ) => MetricHook.MetricHook<
    MetricKeyType.MetricKeyType.InType<(typeof key)["keyType"]>,
    MetricKeyType.MetricKeyType.OutType<(typeof key)["keyType"]>
  >
  readonly getCounter: <A extends number | bigint>(
    key: MetricKey.MetricKey.Counter<A>
  ) => MetricHook.MetricHook.Counter<A>
  readonly getFrequency: (key: MetricKey.MetricKey.Frequency) => MetricHook.MetricHook.Frequency
  readonly getGauge: <A extends number | bigint>(key: MetricKey.MetricKey.Gauge<A>) => MetricHook.MetricHook.Gauge<A>
  readonly getHistogram: (key: MetricKey.MetricKey.Histogram) => MetricHook.MetricHook.Histogram
  readonly getSummary: (key: MetricKey.MetricKey.Summary) => MetricHook.MetricHook.Summary
}
```

Added in v2.0.0

# symbols

## MetricRegistryTypeId

**Signature**

```ts
export declare const MetricRegistryTypeId: typeof MetricRegistryTypeId
```

Added in v2.0.0

## MetricRegistryTypeId (type alias)

**Signature**

```ts
export type MetricRegistryTypeId = typeof MetricRegistryTypeId
```

Added in v2.0.0
