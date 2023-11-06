---
title: TestServices.ts
nav_order: 127
parent: Modules
---

## TestServices overview

Added in v2.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [utils](#utils)
  - [TestServices (type alias)](#testservices-type-alias)
  - [annotate](#annotate)
  - [annotations](#annotations)
  - [annotationsLayer](#annotationslayer)
  - [annotationsWith](#annotationswith)
  - [currentServices](#currentservices)
  - [get](#get)
  - [live](#live)
  - [liveLayer](#livelayer)
  - [liveServices](#liveservices)
  - [liveWith](#livewith)
  - [provideLive](#providelive)
  - [provideWithLive](#providewithlive)
  - [repeats](#repeats)
  - [retries](#retries)
  - [samples](#samples)
  - [shrinks](#shrinks)
  - [size](#size)
  - [sized](#sized)
  - [sizedLayer](#sizedlayer)
  - [sizedWith](#sizedwith)
  - [supervisedFibers](#supervisedfibers)
  - [testConfig](#testconfig)
  - [testConfigLayer](#testconfiglayer)
  - [testConfigWith](#testconfigwith)
  - [withAnnotations](#withannotations)
  - [withAnnotationsScoped](#withannotationsscoped)
  - [withLive](#withlive)
  - [withLiveScoped](#withlivescoped)
  - [withSize](#withsize)
  - [withSized](#withsized)
  - [withSizedScoped](#withsizedscoped)
  - [withTestConfig](#withtestconfig)
  - [withTestConfigScoped](#withtestconfigscoped)

---

# utils

## TestServices (type alias)

**Signature**

```ts
export type TestServices = Annotations.TestAnnotations | Live.TestLive | Sized.TestSized | TestConfig
```

Added in v2.0.0

## annotate

Accesses an `Annotations` instance in the context and appends the
specified annotation to the annotation map.

**Signature**

```ts
export declare const annotate: <A>(key: TestAnnotation<A>, value: A) => Effect<never, never, void>
```

Added in v2.0.0

## annotations

Retrieves the `Annotations` service for this test.

**Signature**

```ts
export declare const annotations: () => Effect<never, never, Annotations.TestAnnotations>
```

Added in v2.0.0

## annotationsLayer

Constructs a new `Annotations` service wrapped in a layer.

**Signature**

```ts
export declare const annotationsLayer: () => Layer<never, never, Annotations.TestAnnotations>
```

Added in v2.0.0

## annotationsWith

Retrieves the `Annotations` service for this test and uses it to run the
specified workflow.

**Signature**

```ts
export declare const annotationsWith: <R, E, A>(
  f: (annotations: Annotations.TestAnnotations) => Effect<R, E, A>
) => Effect<R, E, A>
```

Added in v2.0.0

## currentServices

**Signature**

```ts
export declare const currentServices: FiberRef<Context<TestServices>>
```

Added in v2.0.0

## get

Accesses an `Annotations` instance in the context and retrieves the
annotation of the specified type, or its default value if there is none.

**Signature**

```ts
export declare const get: <A>(key: TestAnnotation<A>) => Effect<never, never, A>
```

Added in v2.0.0

## live

Retrieves the `Live` service for this test.

**Signature**

```ts
export declare const live: Effect<never, never, Live.TestLive>
```

Added in v2.0.0

## liveLayer

Constructs a new `Live` service wrapped in a layer.

**Signature**

```ts
export declare const liveLayer: () => Layer<DefaultServices, never, Live.TestLive>
```

Added in v2.0.0

## liveServices

The default Effect test services.

**Signature**

```ts
export declare const liveServices: Context<TestServices>
```

Added in v2.0.0

## liveWith

Retrieves the `Live` service for this test and uses it to run the specified
workflow.

**Signature**

```ts
export declare const liveWith: <R, E, A>(f: (live: Live.TestLive) => Effect<R, E, A>) => Effect<R, E, A>
```

Added in v2.0.0

## provideLive

Provides a workflow with the "live" default Effect services.

**Signature**

```ts
export declare const provideLive: <R, E, A>(effect: Effect<R, E, A>) => Effect<R, E, A>
```

Added in v2.0.0

## provideWithLive

Runs a transformation function with the live default Effect services while
ensuring that the workflow itself is run with the test services.

**Signature**

```ts
export declare const provideWithLive: (<R, E, A, R2, E2, A2>(
  f: (effect: Effect<R, E, A>) => Effect<R2, E2, A2>
) => (self: Effect<R, E, A>) => Effect<R | R2, E | E2, A2>) &
  (<R, E, A, R2, E2, A2>(
    self: Effect<R, E, A>,
    f: (effect: Effect<R, E, A>) => Effect<R2, E2, A2>
  ) => Effect<R | R2, E | E2, A2>)
```

Added in v2.0.0

## repeats

The number of times to repeat tests to ensure they are stable.

**Signature**

```ts
export declare const repeats: Effect<never, never, number>
```

Added in v2.0.0

## retries

The number of times to retry flaky tests.

**Signature**

```ts
export declare const retries: Effect<never, never, number>
```

Added in v2.0.0

## samples

The number of sufficient samples to check for a random variable.

**Signature**

```ts
export declare const samples: Effect<never, never, number>
```

Added in v2.0.0

## shrinks

The maximum number of shrinkings to minimize large failures.

**Signature**

```ts
export declare const shrinks: Effect<never, never, number>
```

Added in v2.0.0

## size

**Signature**

```ts
export declare const size: Effect<never, never, number>
```

Added in v2.0.0

## sized

Retrieves the `Sized` service for this test.

**Signature**

```ts
export declare const sized: Effect<never, never, Sized.TestSized>
```

Added in v2.0.0

## sizedLayer

**Signature**

```ts
export declare const sizedLayer: (size: number) => Layer<never, never, Sized.TestSized>
```

Added in v2.0.0

## sizedWith

Retrieves the `Sized` service for this test and uses it to run the
specified workflow.

**Signature**

```ts
export declare const sizedWith: <R, E, A>(
  f: (sized: Sized.TestSized) => Effect<R, E, A>
) => Effect<R, E, A>
```

Added in v2.0.0

## supervisedFibers

Returns the set of all fibers in this test.

**Signature**

```ts
export declare const supervisedFibers: () => Effect<
  never,
  never,
  SortedSet<Fiber.RuntimeFiber<unknown, unknown>>
>
```

Added in v2.0.0

## testConfig

Retrieves the `TestConfig` service for this test.

**Signature**

```ts
export declare const testConfig: Effect<never, never, TestConfig>
```

Added in v2.0.0

## testConfigLayer

Constructs a new `TestConfig` service with the specified settings.

**Signature**

```ts
export declare const testConfigLayer: (params: {
  readonly repeats: number
  readonly retries: number
  readonly samples: number
  readonly shrinks: number
}) => Layer<never, never, TestConfig>
```

Added in v2.0.0

## testConfigWith

Retrieves the `TestConfig` service for this test and uses it to run the
specified workflow.

**Signature**

```ts
export declare const testConfigWith: <R, E, A>(
  f: (config: TestConfig) => Effect<R, E, A>
) => Effect<R, E, A>
```

Added in v2.0.0

## withAnnotations

Executes the specified workflow with the specified implementation of the
annotations service.

**Signature**

```ts
export declare const withAnnotations: ((
  annotations: Annotations.TestAnnotations
) => <R, E, A>(effect: Effect<R, E, A>) => Effect<R, E, A>) &
  (<R, E, A>(effect: Effect<R, E, A>, annotations: Annotations.TestAnnotations) => Effect<R, E, A>)
```

Added in v2.0.0

## withAnnotationsScoped

Sets the implementation of the annotations service to the specified value
and restores it to its original value when the scope is closed.

**Signature**

```ts
export declare const withAnnotationsScoped: (
  annotations: Annotations.TestAnnotations
) => Effect<Scope, never, void>
```

Added in v2.0.0

## withLive

Executes the specified workflow with the specified implementation of the
live service.

**Signature**

```ts
export declare const withLive: ((
  live: Live.TestLive
) => <R, E, A>(effect: Effect<R, E, A>) => Effect<R, E, A>) &
  (<R, E, A>(effect: Effect<R, E, A>, live: Live.TestLive) => Effect<R, E, A>)
```

Added in v2.0.0

## withLiveScoped

Sets the implementation of the live service to the specified value and
restores it to its original value when the scope is closed.

**Signature**

```ts
export declare const withLiveScoped: (live: Live.TestLive) => Effect<Scope, never, void>
```

Added in v2.0.0

## withSize

**Signature**

```ts
export declare const withSize: ((size: number) => <R, E, A>(effect: Effect<R, E, A>) => Effect<R, E, A>) &
  (<R, E, A>(effect: Effect<R, E, A>, size: number) => Effect<R, E, A>)
```

Added in v2.0.0

## withSized

Executes the specified workflow with the specified implementation of the
sized service.

**Signature**

```ts
export declare const withSized: ((
  sized: Sized.TestSized
) => <R, E, A>(effect: Effect<R, E, A>) => Effect<R, E, A>) &
  (<R, E, A>(effect: Effect<R, E, A>, sized: Sized.TestSized) => Effect<R, E, A>)
```

Added in v2.0.0

## withSizedScoped

Sets the implementation of the sized service to the specified value and
restores it to its original value when the scope is closed.

**Signature**

```ts
export declare const withSizedScoped: (sized: Sized.TestSized) => Effect<Scope, never, void>
```

Added in v2.0.0

## withTestConfig

Executes the specified workflow with the specified implementation of the
config service.

**Signature**

```ts
export declare const withTestConfig: ((
  config: TestConfig
) => <R, E, A>(effect: Effect<R, E, A>) => Effect<R, E, A>) &
  (<R, E, A>(effect: Effect<R, E, A>, config: TestConfig) => Effect<R, E, A>)
```

Added in v2.0.0

## withTestConfigScoped

Sets the implementation of the config service to the specified value and
restores it to its original value when the scope is closed.

**Signature**

```ts
export declare const withTestConfigScoped: (config: TestConfig) => Effect<Scope, never, void>
```

Added in v2.0.0
