---
title: MetricBoundaries.ts
nav_order: 60
parent: Modules
---

## MetricBoundaries overview

Added in v2.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [constructors](#constructors)
  - [exponential](#exponential)
  - [fromChunk](#fromchunk)
  - [linear](#linear)
- [models](#models)
  - [MetricBoundaries (interface)](#metricboundaries-interface)
- [refinements](#refinements)
  - [isMetricBoundaries](#ismetricboundaries)
- [symbols](#symbols)
  - [MetricBoundariesTypeId](#metricboundariestypeid)
  - [MetricBoundariesTypeId (type alias)](#metricboundariestypeid-type-alias)

---

# constructors

## exponential

A helper method to create histogram bucket boundaries for a histogram
with exponentially increasing values.

**Signature**

```ts
export declare const exponential: (options: {
  readonly start: number
  readonly factor: number
  readonly count: number
}) => MetricBoundaries
```

Added in v2.0.0

## fromChunk

**Signature**

```ts
export declare const fromChunk: (chunk: Chunk.Chunk<number>) => MetricBoundaries
```

Added in v2.0.0

## linear

A helper method to create histogram bucket boundaries for a histogram
with linear increasing values.

**Signature**

```ts
export declare const linear: (options: {
  readonly start: number
  readonly width: number
  readonly count: number
}) => MetricBoundaries
```

Added in v2.0.0

# models

## MetricBoundaries (interface)

**Signature**

```ts
export interface MetricBoundaries extends Equal.Equal, Pipeable {
  readonly [MetricBoundariesTypeId]: MetricBoundariesTypeId
  readonly values: Chunk.Chunk<number>
}
```

Added in v2.0.0

# refinements

## isMetricBoundaries

**Signature**

```ts
export declare const isMetricBoundaries: (u: unknown) => u is MetricBoundaries
```

Added in v2.0.0

# symbols

## MetricBoundariesTypeId

**Signature**

```ts
export declare const MetricBoundariesTypeId: typeof MetricBoundariesTypeId
```

Added in v2.0.0

## MetricBoundariesTypeId (type alias)

**Signature**

```ts
export type MetricBoundariesTypeId = typeof MetricBoundariesTypeId
```

Added in v2.0.0
