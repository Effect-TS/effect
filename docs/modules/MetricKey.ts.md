---
title: MetricKey.ts
nav_order: 62
parent: Modules
---

## MetricKey overview

Added in v1.0.0

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
export declare const counter: (name: string, description?: string) => MetricKey.Counter
```

Added in v1.0.0

## frequency

Creates a metric key for a categorical frequency table, with the specified
name.

**Signature**

```ts
export declare const frequency: (name: string, description?: string) => MetricKey.Frequency
```

Added in v1.0.0

## gauge

Creates a metric key for a gauge, with the specified name.

**Signature**

```ts
export declare const gauge: (name: string, description?: string) => MetricKey.Gauge
```

Added in v1.0.0

## histogram

Creates a metric key for a histogram, with the specified name and boundaries.

**Signature**

```ts
export declare const histogram: (
  name: string,
  boundaries: MetricBoundaries.MetricBoundaries,
  description?: string
) => MetricKey.Histogram
```

Added in v1.0.0

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
  readonly quantiles: Chunk.Chunk<number>
  readonly description?: string
}) => MetricKey.Summary
```

Added in v1.0.0

## tagged

Returns a new `MetricKey` with the specified tag appended.

**Signature**

```ts
export declare const tagged: {
  (key: string, value: string): <Type extends MetricKeyType.MetricKeyType<any, any>>(
    self: MetricKey<Type>
  ) => MetricKey<Type>
  <Type extends MetricKeyType.MetricKeyType<any, any>>(
    self: MetricKey<Type>,
    key: string,
    value: string
  ): MetricKey<Type>
}
```

Added in v1.0.0

## taggedWithLabelSet

Returns a new `MetricKey` with the specified tags appended.

**Signature**

```ts
export declare const taggedWithLabelSet: {
  (extraTags: HashSet.HashSet<MetricLabel.MetricLabel>): <Type extends MetricKeyType.MetricKeyType<any, any>>(
    self: MetricKey<Type>
  ) => MetricKey<Type>
  <Type extends MetricKeyType.MetricKeyType<any, any>>(
    self: MetricKey<Type>,
    extraTags: HashSet.HashSet<MetricLabel.MetricLabel>
  ): MetricKey<Type>
}
```

Added in v1.0.0

## taggedWithLabels

Returns a new `MetricKey` with the specified tags appended.

**Signature**

```ts
export declare const taggedWithLabels: {
  (extraTags: Iterable<MetricLabel.MetricLabel>): <Type extends MetricKeyType.MetricKeyType<any, any>>(
    self: MetricKey<Type>
  ) => MetricKey<Type>
  <Type extends MetricKeyType.MetricKeyType<any, any>>(
    self: MetricKey<Type>,
    extraTags: Iterable<MetricLabel.MetricLabel>
  ): MetricKey<Type>
}
```

Added in v1.0.0

# models

## MetricKey (interface)

A `MetricKey` is a unique key associated with each metric. The key is based
on a combination of the metric type, the name and tags associated with the
metric, an optional description of the key, and any other information to
describe a metric, such as the boundaries of a histogram. In this way, it is
impossible to ever create different metrics with conflicting keys.

**Signature**

```ts
export interface MetricKey<Type extends MetricKeyType.MetricKeyType<any, any>>
  extends MetricKey.Variance<Type>,
    Equal.Equal,
    Pipeable {
  readonly name: string
  readonly keyType: Type
  readonly description: Option.Option<string>
  readonly tags: HashSet.HashSet<MetricLabel.MetricLabel>
}
```

Added in v1.0.0

# refinements

## isMetricKey

**Signature**

```ts
export declare const isMetricKey: (u: unknown) => u is MetricKey<MetricKeyType.MetricKeyType<unknown, unknown>>
```

Added in v1.0.0

# symbols

## MetricKeyTypeId

**Signature**

```ts
export declare const MetricKeyTypeId: typeof MetricKeyTypeId
```

Added in v1.0.0

## MetricKeyTypeId (type alias)

**Signature**

```ts
export type MetricKeyTypeId = typeof MetricKeyTypeId
```

Added in v1.0.0

# utils

## MetricKey (namespace)

Added in v1.0.0

### Variance (interface)

**Signature**

```ts
export interface Variance<Type> {
  readonly [MetricKeyTypeId]: {
    _Type: (_: never) => Type
  }
}
```

Added in v1.0.0

### Counter (type alias)

**Signature**

```ts
export type Counter = MetricKey<MetricKeyType.MetricKeyType.Counter>
```

Added in v1.0.0

### Frequency (type alias)

**Signature**

```ts
export type Frequency = MetricKey<MetricKeyType.MetricKeyType.Frequency>
```

Added in v1.0.0

### Gauge (type alias)

**Signature**

```ts
export type Gauge = MetricKey<MetricKeyType.MetricKeyType.Gauge>
```

Added in v1.0.0

### Histogram (type alias)

**Signature**

```ts
export type Histogram = MetricKey<MetricKeyType.MetricKeyType.Histogram>
```

Added in v1.0.0

### Summary (type alias)

**Signature**

```ts
export type Summary = MetricKey<MetricKeyType.MetricKeyType.Summary>
```

Added in v1.0.0

### Untyped (type alias)

**Signature**

```ts
export type Untyped = MetricKey<any>
```

Added in v1.0.0
