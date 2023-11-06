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
  snapshot(): HashSet<MetricPair.Untyped>
  get<Type extends MetricKeyType<any, any>>(
    key: MetricKey<Type>
  ): MetricHook<
    MetricKeyType.InType<(typeof key)["keyType"]>,
    MetricKeyType.OutType<(typeof key)["keyType"]>
  >
  getCounter<A extends number | bigint>(key: MetricKey.Counter<A>): MetricHook.Counter<A>
  getFrequency(key: MetricKey.Frequency): MetricHook.Frequency
  getGauge<A extends number | bigint>(key: MetricKey.Gauge<A>): MetricHook.Gauge<A>
  getHistogram(key: MetricKey.Histogram): MetricHook.Histogram
  getSummary(key: MetricKey.Summary): MetricHook.Summary
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
