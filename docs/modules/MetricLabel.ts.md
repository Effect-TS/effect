---
title: MetricLabel.ts
nav_order: 54
parent: Modules
---

## MetricLabel overview

Added in v1.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [constructors](#constructors)
  - [make](#make)
- [models](#models)
  - [MetricLabel (interface)](#metriclabel-interface)
- [refinements](#refinements)
  - [isMetricLabel](#ismetriclabel)
- [symbols](#symbols)
  - [MetricLabelTypeId](#metriclabeltypeid)
  - [MetricLabelTypeId (type alias)](#metriclabeltypeid-type-alias)

---

# constructors

## make

**Signature**

```ts
export declare const make: (key: string, value: string) => MetricLabel
```

Added in v1.0.0

# models

## MetricLabel (interface)

A `MetricLabel` represents a key value pair that allows analyzing metrics at
an additional level of granularity.

For example if a metric tracks the response time of a service labels could
be used to create separate versions that track response times for different
clients.

**Signature**

```ts
export interface MetricLabel extends Equal.Equal, Pipeable {
  readonly [MetricLabelTypeId]: MetricLabelTypeId
  readonly key: string
  readonly value: string
}
```

Added in v1.0.0

# refinements

## isMetricLabel

**Signature**

```ts
export declare const isMetricLabel: (u: unknown) => u is MetricLabel
```

Added in v1.0.0

# symbols

## MetricLabelTypeId

**Signature**

```ts
export declare const MetricLabelTypeId: typeof MetricLabelTypeId
```

Added in v1.0.0

## MetricLabelTypeId (type alias)

**Signature**

```ts
export type MetricLabelTypeId = typeof MetricLabelTypeId
```

Added in v1.0.0
