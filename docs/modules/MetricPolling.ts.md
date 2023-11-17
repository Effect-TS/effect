---
title: MetricPolling.ts
nav_order: 63
parent: Modules
---

## MetricPolling overview

Added in v2.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [constructors](#constructors)
  - [collectAll](#collectall)
  - [make](#make)
  - [retry](#retry)
- [models](#models)
  - [MetricPolling (interface)](#metricpolling-interface)
- [symbols](#symbols)
  - [MetricPollingTypeId](#metricpollingtypeid)
  - [MetricPollingTypeId (type alias)](#metricpollingtypeid-type-alias)
- [utils](#utils)
  - [launch](#launch)
  - [poll](#poll)
  - [pollAndUpdate](#pollandupdate)
  - [zip](#zip)

---

# constructors

## collectAll

Collects all of the polling metrics into a single polling metric, which
polls for, updates, and produces the outputs of all individual metrics.

**Signature**

```ts
export declare const collectAll: <R, E, Out>(
  iterable: Iterable<MetricPolling<any, any, R, E, Out>>
) => MetricPolling<any[], any[], R, E, Out[]>
```

Added in v2.0.0

## make

Constructs a new polling metric from a metric and poll effect.

**Signature**

```ts
export declare const make: <Type, In, Out, R, E>(
  metric: Metric.Metric<Type, In, Out>,
  poll: Effect.Effect<R, E, In>
) => MetricPolling<Type, In, R, E, Out>
```

Added in v2.0.0

## retry

Returns a new polling metric whose poll function will be retried with the
specified retry policy.

**Signature**

```ts
export declare const retry: {
  <R2, E, _>(
    policy: Schedule.Schedule<R2, E, _>
  ): <Type, In, R, Out>(self: MetricPolling<Type, In, R, E, Out>) => MetricPolling<Type, In, R2 | R, E, Out>
  <Type, In, R, Out, R2, E, _>(
    self: MetricPolling<Type, In, R, E, Out>,
    policy: Schedule.Schedule<R2, E, _>
  ): MetricPolling<Type, In, R | R2, E, Out>
}
```

Added in v2.0.0

# models

## MetricPolling (interface)

A `MetricPolling` is a combination of a metric and an effect that polls for
updates to the metric.

**Signature**

```ts
export interface MetricPolling<in out Type, in out In, out R, out E, out Out> extends Pipeable {
  readonly [MetricPollingTypeId]: MetricPollingTypeId
  /**
   * The metric that this `MetricPolling` polls to update.
   */
  readonly metric: Metric.Metric<Type, In, Out>
  /**
   * An effect that polls a value that may be fed to the metric.
   */
  readonly poll: Effect.Effect<R, E, In>
}
```

Added in v2.0.0

# symbols

## MetricPollingTypeId

**Signature**

```ts
export declare const MetricPollingTypeId: typeof MetricPollingTypeId
```

Added in v2.0.0

## MetricPollingTypeId (type alias)

**Signature**

```ts
export type MetricPollingTypeId = typeof MetricPollingTypeId
```

Added in v2.0.0

# utils

## launch

Returns an effect that will launch the polling metric in a background
fiber, using the specified schedule.

**Signature**

```ts
export declare const launch: {
  <R2, A2>(
    schedule: Schedule.Schedule<R2, unknown, A2>
  ): <Type, In, R, E, Out>(
    self: MetricPolling<Type, In, R, E, Out>
  ) => Effect.Effect<Scope.Scope | R2 | R, never, Fiber.Fiber<E, A2>>
  <Type, In, R, E, Out, R2, A2>(
    self: MetricPolling<Type, In, R, E, Out>,
    schedule: Schedule.Schedule<R2, unknown, A2>
  ): Effect.Effect<Scope.Scope | R | R2, never, Fiber.Fiber<E, A2>>
}
```

Added in v2.0.0

## poll

An effect that polls a value that may be fed to the metric.

**Signature**

```ts
export declare const poll: <Type, In, R, E, Out>(self: MetricPolling<Type, In, R, E, Out>) => Effect.Effect<R, E, In>
```

Added in v2.0.0

## pollAndUpdate

An effect that polls for a value and uses the value to update the metric.

**Signature**

```ts
export declare const pollAndUpdate: <Type, In, R, E, Out>(
  self: MetricPolling<Type, In, R, E, Out>
) => Effect.Effect<R, E, void>
```

Added in v2.0.0

## zip

Zips this polling metric with the specified polling metric.

**Signature**

```ts
export declare const zip: {
  <Type2, In2, R2, E2, Out2>(
    that: MetricPolling<Type2, In2, R2, E2, Out2>
  ): <Type, In, R, E, Out>(
    self: MetricPolling<Type, In, R, E, Out>
  ) => MetricPolling<readonly [Type, Type2], readonly [In, In2], R2 | R, E2 | E, [Out, Out2]>
  <Type, In, R, E, Out, Type2, In2, R2, E2, Out2>(
    self: MetricPolling<Type, In, R, E, Out>,
    that: MetricPolling<Type2, In2, R2, E2, Out2>
  ): MetricPolling<readonly [Type, Type2], readonly [In, In2], R | R2, E | E2, [Out, Out2]>
}
```

Added in v2.0.0
