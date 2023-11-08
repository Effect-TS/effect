---
title: MetricKey.ts
nav_order: 59
parent: Modules
---

## MetricKey overview

Added in v2.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [constructors](#constructors)
  - [counter](#counter)
  - [frequency](#frequency)
  - [gauge](#gauge)
  - [histogram](#histogram)
  - [summary](#summary)
  - [tagged](#tagged)
  - [taggedWithLabelSet](#taggedwithlabelset)
  - [taggedWithLabels](#taggedwithlabels)
- [models](#models)
  - [MetricKey (interface)](#metrickey-interface)
- [refinements](#refinements)
  - [isMetricKey](#ismetrickey)
- [symbols](#symbols)
  - [MetricKeyTypeId](#metrickeytypeid)
  - [MetricKeyTypeId (type alias)](#metrickeytypeid-type-alias)
- [utils](#utils)
  - [MetricKey (namespace)](#metrickey-namespace)
    - [Variance (interface)](#variance-interface)
    - [Counter (type alias)](#counter-type-alias)
    - [Frequency (type alias)](#frequency-type-alias)
    - [Gauge (type alias)](#gauge-type-alias)
    - [Histogram (type alias)](#histogram-type-alias)
    - [Summary (type alias)](#summary-type-alias)
    - [Untyped (type alias)](#untyped-type-alias)

---

# constructors

## counter

Creates a metric key for a counter, with the specified name.

**Signature**

```ts
export declare const counter: {
  (
    name: string,
    options?: { readonly description?: string; readonly bigint?: false; readonly incremental?: boolean }
  ): MetricKey.Counter<number>
  (
    name: string,
    options: { readonly description?: string; readonly bigint: true; readonly incremental?: boolean }
  ): MetricKey.Counter<bigint>
}
```

Added in v2.0.0

## frequency

Creates a metric key for a categorical frequency table, with the specified
name.

**Signature**

```ts
export declare const frequency: (name: string, description?: string) => MetricKey.Frequency
```

Added in v2.0.0

## gauge

Creates a metric key for a gauge, with the specified name.

**Signature**

```ts
export declare const gauge: {
  (name: string, options?: { readonly description?: string; readonly bigint?: false }): MetricKey.Gauge<number>
  (name: string, options: { readonly description?: string; readonly bigint: true }): MetricKey.Gauge<bigint>
}
```

Added in v2.0.0

## histogram

Creates a metric key for a histogram, with the specified name and boundaries.

**Signature**

```ts
export declare const histogram: (
  name: string,
  boundaries: MetricBoundaries,
  description?: string
) => MetricKey.Histogram
```

Added in v2.0.0

## summary

Creates a metric key for a summary, with the specified name, maxAge,
maxSize, error, and quantiles.

**Signature**

```ts
export declare const summary: (options: {
  readonly name: string
  readonly maxAge: Duration.DurationInput
  readonly maxSize: number
  readonly error: number
  readonly quantiles: Chunk<number>
  readonly description?: string
}) => MetricKey.Summary
```

Added in v2.0.0

## tagged

Returns a new `MetricKey` with the specified tag appended.

**Signature**

```ts
export declare const tagged: {
  (
    key: string,
    value: string
  ): <Type extends MetricKeyType<any, any>>(self: MetricKey<Type>) => MetricKey<Type>
  <Type extends MetricKeyType<any, any>>(
    self: MetricKey<Type>,
    key: string,
    value: string
  ): MetricKey<Type>
}
```

Added in v2.0.0

## taggedWithLabelSet

Returns a new `MetricKey` with the specified tags appended.

**Signature**

```ts
export declare const taggedWithLabelSet: {
  (
    extraTags: HashSet<MetricLabel>
  ): <Type extends MetricKeyType<any, any>>(self: MetricKey<Type>) => MetricKey<Type>
  <Type extends MetricKeyType<any, any>>(
    self: MetricKey<Type>,
    extraTags: HashSet<MetricLabel>
  ): MetricKey<Type>
}
```

Added in v2.0.0

## taggedWithLabels

Returns a new `MetricKey` with the specified tags appended.

**Signature**

```ts
export declare const taggedWithLabels: {
  (
    extraTags: Iterable<MetricLabel>
  ): <Type extends MetricKeyType<any, any>>(self: MetricKey<Type>) => MetricKey<Type>
  <Type extends MetricKeyType<any, any>>(
    self: MetricKey<Type>,
    extraTags: Iterable<MetricLabel>
  ): MetricKey<Type>
}
```

Added in v2.0.0

# models

## MetricKey (interface)

A `MetricKey` is a unique key associated with each metric. The key is based
on a combination of the metric type, the name and tags associated with the
metric, an optional description of the key, and any other information to
describe a metric, such as the boundaries of a histogram. In this way, it is
impossible to ever create different metrics with conflicting keys.

**Signature**

```ts
export interface MetricKey<Type extends MetricKeyType<any, any>>
  extends MetricKey.Variance<Type>,
    Equal,
    Pipeable {
  readonly name: string
  readonly keyType: Type
  readonly description: Option<string>
  readonly tags: HashSet<MetricLabel>
}
```

Added in v2.0.0

# refinements

## isMetricKey

**Signature**

```ts
export declare const isMetricKey: (u: unknown) => u is MetricKey<MetricKeyType<unknown, unknown>>
```

Added in v2.0.0

# symbols

## MetricKeyTypeId

**Signature**

```ts
export declare const MetricKeyTypeId: typeof MetricKeyTypeId
```

Added in v2.0.0

## MetricKeyTypeId (type alias)

**Signature**

```ts
export type MetricKeyTypeId = typeof MetricKeyTypeId
```

Added in v2.0.0

# utils

## MetricKey (namespace)

Added in v2.0.0

### Variance (interface)

**Signature**

```ts
export interface Variance<Type> {
  readonly [MetricKeyTypeId]: {
    _Type: (_: never) => Type
  }
}
```

Added in v2.0.0

### Counter (type alias)

**Signature**

```ts
export type Counter<A extends number | bigint> = MetricKey<MetricKeyType.Counter<A>>
```

Added in v2.0.0

### Frequency (type alias)

**Signature**

```ts
export type Frequency = MetricKey<MetricKeyType.Frequency>
```

Added in v2.0.0

### Gauge (type alias)

**Signature**

```ts
export type Gauge<A extends number | bigint> = MetricKey<MetricKeyType.Gauge<A>>
```

Added in v2.0.0

### Histogram (type alias)

**Signature**

```ts
export type Histogram = MetricKey<MetricKeyType.Histogram>
```

Added in v2.0.0

### Summary (type alias)

**Signature**

```ts
export type Summary = MetricKey<MetricKeyType.Summary>
```

Added in v2.0.0

### Untyped (type alias)

**Signature**

```ts
export type Untyped = MetricKey<any>
```

Added in v2.0.0
