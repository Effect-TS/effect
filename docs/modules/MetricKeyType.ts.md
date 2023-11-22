---
title: MetricKeyType.ts
nav_order: 60
parent: Modules
---

## MetricKeyType overview

Added in v2.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [constructors](#constructors)
  - [counter](#counter)
  - [frequency](#frequency)
  - [gauge](#gauge)
  - [histogram](#histogram)
  - [summary](#summary)
- [modelz](#modelz)
  - [MetricKeyType (interface)](#metrickeytype-interface)
- [refinements](#refinements)
  - [isCounterKey](#iscounterkey)
  - [isFrequencyKey](#isfrequencykey)
  - [isGaugeKey](#isgaugekey)
  - [isHistogramKey](#ishistogramkey)
  - [isMetricKeyType](#ismetrickeytype)
  - [isSummaryKey](#issummarykey)
- [symbols](#symbols)
  - [CounterKeyTypeTypeId](#counterkeytypetypeid)
  - [CounterKeyTypeTypeId (type alias)](#counterkeytypetypeid-type-alias)
  - [FrequencyKeyTypeTypeId](#frequencykeytypetypeid)
  - [FrequencyKeyTypeTypeId (type alias)](#frequencykeytypetypeid-type-alias)
  - [GaugeKeyTypeTypeId](#gaugekeytypetypeid)
  - [GaugeKeyTypeTypeId (type alias)](#gaugekeytypetypeid-type-alias)
  - [HistogramKeyTypeTypeId](#histogramkeytypetypeid)
  - [HistogramKeyTypeTypeId (type alias)](#histogramkeytypetypeid-type-alias)
  - [MetricKeyTypeTypeId](#metrickeytypetypeid)
  - [MetricKeyTypeTypeId (type alias)](#metrickeytypetypeid-type-alias)
  - [SummaryKeyTypeTypeId](#summarykeytypetypeid)
  - [SummaryKeyTypeTypeId (type alias)](#summarykeytypetypeid-type-alias)
- [utils](#utils)
  - [MetricKeyType (namespace)](#metrickeytype-namespace)
    - [Variance (interface)](#variance-interface)
    - [Counter (type alias)](#counter-type-alias)
    - [Frequency (type alias)](#frequency-type-alias)
    - [Gauge (type alias)](#gauge-type-alias)
    - [Histogram (type alias)](#histogram-type-alias)
    - [InType (type alias)](#intype-type-alias)
    - [OutType (type alias)](#outtype-type-alias)
    - [Summary (type alias)](#summary-type-alias)
    - [Untyped (type alias)](#untyped-type-alias)

---

# constructors

## counter

**Signature**

```ts
export declare const counter: <A extends number | bigint>() => MetricKeyType.Counter<A>
```

Added in v2.0.0

## frequency

**Signature**

```ts
export declare const frequency: MetricKeyType.Frequency
```

Added in v2.0.0

## gauge

**Signature**

```ts
export declare const gauge: <A extends number | bigint>() => MetricKeyType.Gauge<A>
```

Added in v2.0.0

## histogram

**Signature**

```ts
export declare const histogram: (boundaries: MetricBoundaries.MetricBoundaries) => MetricKeyType.Histogram
```

Added in v2.0.0

## summary

**Signature**

```ts
export declare const summary: (options: {
  readonly maxAge: Duration.DurationInput
  readonly maxSize: number
  readonly error: number
  readonly quantiles: Chunk.Chunk<number>
}) => MetricKeyType.Summary
```

Added in v2.0.0

# modelz

## MetricKeyType (interface)

**Signature**

```ts
export interface MetricKeyType<in In, out Out> extends MetricKeyType.Variance<In, Out>, Equal.Equal, Pipeable {}
```

Added in v2.0.0

# refinements

## isCounterKey

**Signature**

```ts
export declare const isCounterKey: (u: unknown) => u is MetricKeyType.Counter<number | bigint>
```

Added in v2.0.0

## isFrequencyKey

**Signature**

```ts
export declare const isFrequencyKey: (u: unknown) => u is MetricKeyType.Frequency
```

Added in v2.0.0

## isGaugeKey

**Signature**

```ts
export declare const isGaugeKey: (u: unknown) => u is MetricKeyType.Gauge<number | bigint>
```

Added in v2.0.0

## isHistogramKey

**Signature**

```ts
export declare const isHistogramKey: (u: unknown) => u is MetricKeyType.Histogram
```

Added in v2.0.0

## isMetricKeyType

**Signature**

```ts
export declare const isMetricKeyType: (u: unknown) => u is MetricKeyType<unknown, unknown>
```

Added in v2.0.0

## isSummaryKey

**Signature**

```ts
export declare const isSummaryKey: (u: unknown) => u is MetricKeyType.Summary
```

Added in v2.0.0

# symbols

## CounterKeyTypeTypeId

**Signature**

```ts
export declare const CounterKeyTypeTypeId: typeof CounterKeyTypeTypeId
```

Added in v2.0.0

## CounterKeyTypeTypeId (type alias)

**Signature**

```ts
export type CounterKeyTypeTypeId = typeof CounterKeyTypeTypeId
```

Added in v2.0.0

## FrequencyKeyTypeTypeId

**Signature**

```ts
export declare const FrequencyKeyTypeTypeId: typeof FrequencyKeyTypeTypeId
```

Added in v2.0.0

## FrequencyKeyTypeTypeId (type alias)

**Signature**

```ts
export type FrequencyKeyTypeTypeId = typeof FrequencyKeyTypeTypeId
```

Added in v2.0.0

## GaugeKeyTypeTypeId

**Signature**

```ts
export declare const GaugeKeyTypeTypeId: typeof GaugeKeyTypeTypeId
```

Added in v2.0.0

## GaugeKeyTypeTypeId (type alias)

**Signature**

```ts
export type GaugeKeyTypeTypeId = typeof GaugeKeyTypeTypeId
```

Added in v2.0.0

## HistogramKeyTypeTypeId

**Signature**

```ts
export declare const HistogramKeyTypeTypeId: typeof HistogramKeyTypeTypeId
```

Added in v2.0.0

## HistogramKeyTypeTypeId (type alias)

**Signature**

```ts
export type HistogramKeyTypeTypeId = typeof HistogramKeyTypeTypeId
```

Added in v2.0.0

## MetricKeyTypeTypeId

**Signature**

```ts
export declare const MetricKeyTypeTypeId: typeof MetricKeyTypeTypeId
```

Added in v2.0.0

## MetricKeyTypeTypeId (type alias)

**Signature**

```ts
export type MetricKeyTypeTypeId = typeof MetricKeyTypeTypeId
```

Added in v2.0.0

## SummaryKeyTypeTypeId

**Signature**

```ts
export declare const SummaryKeyTypeTypeId: typeof SummaryKeyTypeTypeId
```

Added in v2.0.0

## SummaryKeyTypeTypeId (type alias)

**Signature**

```ts
export type SummaryKeyTypeTypeId = typeof SummaryKeyTypeTypeId
```

Added in v2.0.0

# utils

## MetricKeyType (namespace)

Added in v2.0.0

### Variance (interface)

**Signature**

```ts
export interface Variance<in In, out Out> {
  readonly [MetricKeyTypeTypeId]: {
    readonly _In: Types.Contravariant<In>
    readonly _Out: Types.Covariant<Out>
  }
}
```

Added in v2.0.0

### Counter (type alias)

**Signature**

```ts
export type Counter<A extends number | bigint> = MetricKeyType<A, MetricState.MetricState.Counter<A>> & {
  readonly [CounterKeyTypeTypeId]: CounterKeyTypeTypeId
  readonly incremental: boolean
  readonly bigint: boolean
}
```

Added in v2.0.0

### Frequency (type alias)

**Signature**

```ts
export type Frequency = MetricKeyType<string, MetricState.MetricState.Frequency> & {
  readonly [FrequencyKeyTypeTypeId]: FrequencyKeyTypeTypeId
}
```

Added in v2.0.0

### Gauge (type alias)

**Signature**

```ts
export type Gauge<A extends number | bigint> = MetricKeyType<A, MetricState.MetricState.Gauge<A>> & {
  readonly [GaugeKeyTypeTypeId]: GaugeKeyTypeTypeId
  readonly bigint: boolean
}
```

Added in v2.0.0

### Histogram (type alias)

**Signature**

```ts
export type Histogram = MetricKeyType<number, MetricState.MetricState.Histogram> & {
  readonly [HistogramKeyTypeTypeId]: HistogramKeyTypeTypeId
  readonly boundaries: MetricBoundaries.MetricBoundaries
}
```

Added in v2.0.0

### InType (type alias)

**Signature**

```ts
export type InType<Type extends MetricKeyType<any, any>> = [Type] extends [
  {
    readonly [MetricKeyTypeTypeId]: {
      readonly _In: (_: infer In) => void
    }
  }
]
  ? In
  : never
```

Added in v2.0.0

### OutType (type alias)

**Signature**

```ts
export type OutType<Type extends MetricKeyType<any, any>> = [Type] extends [
  {
    readonly [MetricKeyTypeTypeId]: {
      readonly _Out: (_: never) => infer Out
    }
  }
]
  ? Out
  : never
```

Added in v2.0.0

### Summary (type alias)

**Signature**

```ts
export type Summary = MetricKeyType<readonly [number, number], MetricState.MetricState.Summary> & {
  readonly [SummaryKeyTypeTypeId]: SummaryKeyTypeTypeId
  readonly maxAge: Duration.Duration
  readonly maxSize: number
  readonly error: number
  readonly quantiles: Chunk.Chunk<number>
}
```

Added in v2.0.0

### Untyped (type alias)

**Signature**

```ts
export type Untyped = MetricKeyType<any, any>
```

Added in v2.0.0
