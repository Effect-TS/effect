---
title: MetricState.ts
nav_order: 65
parent: Modules
---

## MetricState overview

Added in v2.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [constructors](#constructors)
  - [counter](#counter)
  - [frequency](#frequency)
  - [gauge](#gauge)
  - [histogram](#histogram)
  - [summary](#summary)
- [models](#models)
  - [MetricState (interface)](#metricstate-interface)
- [refinements](#refinements)
  - [isCounterState](#iscounterstate)
  - [isFrequencyState](#isfrequencystate)
  - [isGaugeState](#isgaugestate)
  - [isHistogramState](#ishistogramstate)
  - [isMetricState](#ismetricstate)
  - [isSummaryState](#issummarystate)
- [symbols](#symbols)
  - [CounterStateTypeId](#counterstatetypeid)
  - [CounterStateTypeId (type alias)](#counterstatetypeid-type-alias)
  - [FrequencyStateTypeId](#frequencystatetypeid)
  - [FrequencyStateTypeId (type alias)](#frequencystatetypeid-type-alias)
  - [GaugeStateTypeId](#gaugestatetypeid)
  - [GaugeStateTypeId (type alias)](#gaugestatetypeid-type-alias)
  - [HistogramStateTypeId](#histogramstatetypeid)
  - [HistogramStateTypeId (type alias)](#histogramstatetypeid-type-alias)
  - [MetricStateTypeId](#metricstatetypeid)
  - [MetricStateTypeId (type alias)](#metricstatetypeid-type-alias)
  - [SummaryStateTypeId](#summarystatetypeid)
  - [SummaryStateTypeId (type alias)](#summarystatetypeid-type-alias)
- [utils](#utils)
  - [MetricState (namespace)](#metricstate-namespace)
    - [Counter (interface)](#counter-interface)
    - [Frequency (interface)](#frequency-interface)
    - [Gauge (interface)](#gauge-interface)
    - [Histogram (interface)](#histogram-interface)
    - [Summary (interface)](#summary-interface)
    - [Untyped (interface)](#untyped-interface)
    - [Variance (interface)](#variance-interface)

---

# constructors

## counter

**Signature**

```ts
export declare const counter: {
  (count: number): MetricState.Counter<number>
  (count: bigint): MetricState.Counter<bigint>
}
```

Added in v2.0.0

## frequency

**Signature**

```ts
export declare const frequency: (occurrences: HashMap<string, number>) => MetricState.Frequency
```

Added in v2.0.0

## gauge

**Signature**

```ts
export declare const gauge: { (count: number): MetricState.Gauge<number>; (count: bigint): MetricState.Gauge<bigint> }
```

Added in v2.0.0

## histogram

**Signature**

```ts
export declare const histogram: (options: {
  readonly buckets: Chunk<readonly [number, number]>
  readonly count: number
  readonly min: number
  readonly max: number
  readonly sum: number
}) => MetricState.Histogram
```

Added in v2.0.0

## summary

**Signature**

```ts
export declare const summary: (options: {
  readonly error: number
  readonly quantiles: Chunk<readonly [number, Option<number>]>
  readonly count: number
  readonly min: number
  readonly max: number
  readonly sum: number
}) => MetricState.Summary
```

Added in v2.0.0

# models

## MetricState (interface)

A `MetricState` describes the state of a metric. The type parameter of a
metric state corresponds to the type of the metric key (`MetricStateType`).
This phantom type parameter is used to tie keys to their expected states.

**Signature**

```ts
export interface MetricState<A> extends MetricState.Variance<A>, Equal, Pipeable {}
```

Added in v2.0.0

# refinements

## isCounterState

**Signature**

```ts
export declare const isCounterState: (u: unknown) => u is MetricState.Counter<number | bigint>
```

Added in v2.0.0

## isFrequencyState

**Signature**

```ts
export declare const isFrequencyState: (u: unknown) => u is MetricState.Frequency
```

Added in v2.0.0

## isGaugeState

**Signature**

```ts
export declare const isGaugeState: (u: unknown) => u is MetricState.Gauge<number | bigint>
```

Added in v2.0.0

## isHistogramState

**Signature**

```ts
export declare const isHistogramState: (u: unknown) => u is MetricState.Histogram
```

Added in v2.0.0

## isMetricState

**Signature**

```ts
export declare const isMetricState: (u: unknown) => u is MetricState.Counter<number | bigint>
```

Added in v2.0.0

## isSummaryState

**Signature**

```ts
export declare const isSummaryState: (u: unknown) => u is MetricState.Summary
```

Added in v2.0.0

# symbols

## CounterStateTypeId

**Signature**

```ts
export declare const CounterStateTypeId: typeof CounterStateTypeId
```

Added in v2.0.0

## CounterStateTypeId (type alias)

**Signature**

```ts
export type CounterStateTypeId = typeof CounterStateTypeId
```

Added in v2.0.0

## FrequencyStateTypeId

**Signature**

```ts
export declare const FrequencyStateTypeId: typeof FrequencyStateTypeId
```

Added in v2.0.0

## FrequencyStateTypeId (type alias)

**Signature**

```ts
export type FrequencyStateTypeId = typeof FrequencyStateTypeId
```

Added in v2.0.0

## GaugeStateTypeId

**Signature**

```ts
export declare const GaugeStateTypeId: typeof GaugeStateTypeId
```

Added in v2.0.0

## GaugeStateTypeId (type alias)

**Signature**

```ts
export type GaugeStateTypeId = typeof GaugeStateTypeId
```

Added in v2.0.0

## HistogramStateTypeId

**Signature**

```ts
export declare const HistogramStateTypeId: typeof HistogramStateTypeId
```

Added in v2.0.0

## HistogramStateTypeId (type alias)

**Signature**

```ts
export type HistogramStateTypeId = typeof HistogramStateTypeId
```

Added in v2.0.0

## MetricStateTypeId

**Signature**

```ts
export declare const MetricStateTypeId: typeof MetricStateTypeId
```

Added in v2.0.0

## MetricStateTypeId (type alias)

**Signature**

```ts
export type MetricStateTypeId = typeof MetricStateTypeId
```

Added in v2.0.0

## SummaryStateTypeId

**Signature**

```ts
export declare const SummaryStateTypeId: typeof SummaryStateTypeId
```

Added in v2.0.0

## SummaryStateTypeId (type alias)

**Signature**

```ts
export type SummaryStateTypeId = typeof SummaryStateTypeId
```

Added in v2.0.0

# utils

## MetricState (namespace)

Added in v2.0.0

### Counter (interface)

**Signature**

```ts
export interface Counter<A extends number | bigint> extends MetricState<MetricKeyType.Counter<A>> {
  readonly [CounterStateTypeId]: CounterStateTypeId
  readonly count: A
}
```

Added in v2.0.0

### Frequency (interface)

**Signature**

```ts
export interface Frequency extends MetricState<MetricKeyType.Frequency> {
  readonly [FrequencyStateTypeId]: FrequencyStateTypeId
  readonly occurrences: HashMap<string, number>
}
```

Added in v2.0.0

### Gauge (interface)

**Signature**

```ts
export interface Gauge<A extends number | bigint> extends MetricState<MetricKeyType.Gauge<A>> {
  readonly [GaugeStateTypeId]: GaugeStateTypeId
  readonly value: A
}
```

Added in v2.0.0

### Histogram (interface)

**Signature**

```ts
export interface Histogram extends MetricState<MetricKeyType.Histogram> {
  readonly [HistogramStateTypeId]: HistogramStateTypeId
  readonly buckets: Chunk<readonly [number, number]>
  readonly count: number
  readonly min: number
  readonly max: number
  readonly sum: number
}
```

Added in v2.0.0

### Summary (interface)

**Signature**

```ts
export interface Summary extends MetricState<MetricKeyType.Summary> {
  readonly [SummaryStateTypeId]: SummaryStateTypeId
  readonly error: number
  readonly quantiles: Chunk<readonly [number, Option<number>]>
  readonly count: number
  readonly min: number
  readonly max: number
  readonly sum: number
}
```

Added in v2.0.0

### Untyped (interface)

**Signature**

```ts
export interface Untyped extends MetricState<any> {}
```

Added in v2.0.0

### Variance (interface)

**Signature**

```ts
export interface Variance<A> {
  readonly [MetricStateTypeId]: {
    readonly _A: (_: A) => void
  }
}
```

Added in v2.0.0
