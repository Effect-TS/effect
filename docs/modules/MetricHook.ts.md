---
title: MetricHook.ts
nav_order: 58
parent: Modules
---

## MetricHook overview

Added in v2.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [constructors](#constructors)
  - [counter](#counter)
  - [frequency](#frequency)
  - [gauge](#gauge)
  - [histogram](#histogram)
  - [make](#make)
  - [summary](#summary)
- [models](#models)
  - [MetricHook (interface)](#metrichook-interface)
- [symbols](#symbols)
  - [MetricHookTypeId](#metrichooktypeid)
  - [MetricHookTypeId (type alias)](#metrichooktypeid-type-alias)
- [utils](#utils)
  - [MetricHook (namespace)](#metrichook-namespace)
    - [Variance (interface)](#variance-interface)
    - [Counter (type alias)](#counter-type-alias)
    - [Frequency (type alias)](#frequency-type-alias)
    - [Gauge (type alias)](#gauge-type-alias)
    - [Histogram (type alias)](#histogram-type-alias)
    - [Root (type alias)](#root-type-alias)
    - [Summary (type alias)](#summary-type-alias)
    - [Untyped (type alias)](#untyped-type-alias)
  - [onUpdate](#onupdate)

---

# constructors

## counter

**Signature**

```ts
export declare const counter: <A extends number | bigint>(key: MetricKey.MetricKey.Counter<A>) => MetricHook.Counter<A>
```

Added in v2.0.0

## frequency

**Signature**

```ts
export declare const frequency: (_key: MetricKey.MetricKey.Frequency) => MetricHook.Frequency
```

Added in v2.0.0

## gauge

**Signature**

```ts
export declare const gauge: {
  (key: MetricKey.MetricKey.Gauge<number>, startAt: number): MetricHook.Gauge<number>
  (key: MetricKey.MetricKey.Gauge<bigint>, startAt: bigint): MetricHook.Gauge<bigint>
}
```

Added in v2.0.0

## histogram

**Signature**

```ts
export declare const histogram: (key: MetricKey.MetricKey.Histogram) => MetricHook.Histogram
```

Added in v2.0.0

## make

**Signature**

```ts
export declare const make: <In, Out>(options: {
  readonly get: LazyArg<Out>
  readonly update: (input: In) => void
}) => MetricHook<In, Out>
```

Added in v2.0.0

## summary

**Signature**

```ts
export declare const summary: (key: MetricKey.MetricKey.Summary) => MetricHook.Summary
```

Added in v2.0.0

# models

## MetricHook (interface)

**Signature**

```ts
export interface MetricHook<in In, out Out> extends MetricHook.Variance<In, Out>, Pipeable {
  get(): Out
  update(input: In): void
}
```

Added in v2.0.0

# symbols

## MetricHookTypeId

**Signature**

```ts
export declare const MetricHookTypeId: typeof MetricHookTypeId
```

Added in v2.0.0

## MetricHookTypeId (type alias)

**Signature**

```ts
export type MetricHookTypeId = typeof MetricHookTypeId
```

Added in v2.0.0

# utils

## MetricHook (namespace)

Added in v2.0.0

### Variance (interface)

**Signature**

```ts
export interface Variance<in In, out Out> {
  readonly [MetricHookTypeId]: {
    readonly _In: (_: In) => void
    readonly _Out: (_: never) => Out
  }
}
```

Added in v2.0.0

### Counter (type alias)

**Signature**

```ts
export type Counter<A extends number | bigint> = MetricHook<A, MetricState.MetricState.Counter<A>>
```

Added in v2.0.0

### Frequency (type alias)

**Signature**

```ts
export type Frequency = MetricHook<string, MetricState.MetricState.Frequency>
```

Added in v2.0.0

### Gauge (type alias)

**Signature**

```ts
export type Gauge<A extends number | bigint> = MetricHook<A, MetricState.MetricState.Gauge<A>>
```

Added in v2.0.0

### Histogram (type alias)

**Signature**

```ts
export type Histogram = MetricHook<number, MetricState.MetricState.Histogram>
```

Added in v2.0.0

### Root (type alias)

**Signature**

```ts
export type Root = MetricHook<any, MetricState.MetricState.Untyped>
```

Added in v2.0.0

### Summary (type alias)

**Signature**

```ts
export type Summary = MetricHook<readonly [number, number], MetricState.MetricState.Summary>
```

Added in v2.0.0

### Untyped (type alias)

**Signature**

```ts
export type Untyped = MetricHook<any, any>
```

Added in v2.0.0

## onUpdate

**Signature**

```ts
export declare const onUpdate: {
  <In, Out>(f: (input: In) => void): (self: MetricHook<In, Out>) => MetricHook<In, Out>
  <In, Out>(self: MetricHook<In, Out>, f: (input: In) => void): MetricHook<In, Out>
}
```

Added in v2.0.0
