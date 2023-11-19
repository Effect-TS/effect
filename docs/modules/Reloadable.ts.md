---
title: Reloadable.ts
nav_order: 87
parent: Modules
---

## Reloadable overview

Added in v2.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [constructors](#constructors)
  - [auto](#auto)
  - [autoFromConfig](#autofromconfig)
  - [manual](#manual)
  - [reload](#reload)
  - [reloadFork](#reloadfork)
- [context](#context)
  - [tag](#tag)
- [getters](#getters)
  - [get](#get)
- [models](#models)
  - [Reloadable (interface)](#reloadable-interface)
- [symbols](#symbols)
  - [ReloadableTypeId](#reloadabletypeid)
  - [ReloadableTypeId (type alias)](#reloadabletypeid-type-alias)
- [utils](#utils)
  - [Reloadable (namespace)](#reloadable-namespace)
    - [Variance (interface)](#variance-interface)

---

# constructors

## auto

Makes a new reloadable service from a layer that describes the construction
of a static service. The service is automatically reloaded according to the
provided schedule.

**Signature**

```ts
export declare const auto: <Out extends Context.Tag<any, any>, In, E, R>(
  tag: Out,
  options: {
    readonly layer: Layer.Layer<In, E, Context.Tag.Identifier<Out>>
    readonly schedule: Schedule.Schedule<R, unknown, unknown>
  }
) => Layer.Layer<In | R, E, Reloadable<Context.Tag.Identifier<Out>>>
```

Added in v2.0.0

## autoFromConfig

Makes a new reloadable service from a layer that describes the construction
of a static service. The service is automatically reloaded according to a
schedule, which is extracted from the input to the layer.

**Signature**

```ts
export declare const autoFromConfig: <Out extends Context.Tag<any, any>, In, E, R>(
  tag: Out,
  options: {
    readonly layer: Layer.Layer<In, E, Context.Tag.Identifier<Out>>
    readonly scheduleFromConfig: (context: Context.Context<In>) => Schedule.Schedule<R, unknown, unknown>
  }
) => Layer.Layer<In | R, E, Reloadable<Context.Tag.Identifier<Out>>>
```

Added in v2.0.0

## manual

Makes a new reloadable service from a layer that describes the construction
of a static service.

**Signature**

```ts
export declare const manual: <Out extends Context.Tag<any, any>, In, E>(
  tag: Out,
  options: { readonly layer: Layer.Layer<In, E, Context.Tag.Identifier<Out>> }
) => Layer.Layer<In, E, Reloadable<Context.Tag.Identifier<Out>>>
```

Added in v2.0.0

## reload

Reloads the specified service.

**Signature**

```ts
export declare const reload: <T extends Context.Tag<any, any>>(
  tag: T
) => Effect.Effect<Reloadable<Context.Tag.Identifier<T>>, unknown, void>
```

Added in v2.0.0

## reloadFork

Forks the reload of the service in the background, ignoring any errors.

**Signature**

```ts
export declare const reloadFork: <T extends Context.Tag<any, any>>(
  tag: T
) => Effect.Effect<Reloadable<Context.Tag.Identifier<T>>, unknown, void>
```

Added in v2.0.0

# context

## tag

**Signature**

```ts
export declare const tag: <T extends Context.Tag<any, any>>(
  tag: T
) => Context.Tag<Reloadable<Context.Tag.Identifier<T>>, Reloadable<Context.Tag.Service<T>>>
```

Added in v2.0.0

# getters

## get

Retrieves the current version of the reloadable service.

**Signature**

```ts
export declare const get: <T extends Context.Tag<any, any>>(
  tag: T
) => Effect.Effect<Reloadable<Context.Tag.Identifier<T>>, never, Context.Tag.Service<T>>
```

Added in v2.0.0

# models

## Reloadable (interface)

A `Reloadable` is an implementation of some service that can be dynamically
reloaded, or swapped out for another implementation on-the-fly.

**Signature**

```ts
export interface Reloadable<in out A> extends Reloadable.Variance<A> {
  /**
   * @internal
   */
  readonly scopedRef: ScopedRef.ScopedRef<A>
  /**
   * @internal
   */
  readonly reload: Effect.Effect<never, unknown, void>
}
```

Added in v2.0.0

# symbols

## ReloadableTypeId

**Signature**

```ts
export declare const ReloadableTypeId: typeof ReloadableTypeId
```

Added in v2.0.0

## ReloadableTypeId (type alias)

**Signature**

```ts
export type ReloadableTypeId = typeof ReloadableTypeId
```

Added in v2.0.0

# utils

## Reloadable (namespace)

Added in v2.0.0

### Variance (interface)

**Signature**

```ts
export interface Variance<in out A> {
  readonly [ReloadableTypeId]: {
    readonly _A: (_: A) => A
  }
}
```

Added in v2.0.0
