---
title: TestAnnotationMap.ts
nav_order: 121
parent: Modules
---

## TestAnnotationMap overview

Added in v1.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [utils](#utils)
  - [TestAnnotationMap (interface)](#testannotationmap-interface)
  - [TestAnnotationMapTypeId](#testannotationmaptypeid)
  - [TestAnnotationMapTypeId (type alias)](#testannotationmaptypeid-type-alias)
  - [annotate](#annotate)
  - [combine](#combine)
  - [empty](#empty)
  - [get](#get)
  - [isTestAnnotationMap](#istestannotationmap)
  - [make](#make)
  - [overwrite](#overwrite)
  - [update](#update)

---

# utils

## TestAnnotationMap (interface)

An annotation map keeps track of annotations of different types.

**Signature**

```ts
export interface TestAnnotationMap {
  readonly [TestAnnotationMapTypeId]: TestAnnotationMapTypeId
  /** @internal */
  readonly map: ReadonlyMap<TestAnnotation.TestAnnotation<unknown>, unknown>
}
```

Added in v1.0.0

## TestAnnotationMapTypeId

**Signature**

```ts
export declare const TestAnnotationMapTypeId: typeof TestAnnotationMapTypeId
```

Added in v1.0.0

## TestAnnotationMapTypeId (type alias)

**Signature**

```ts
export type TestAnnotationMapTypeId = typeof TestAnnotationMapTypeId
```

Added in v1.0.0

## annotate

Appends the specified annotation to the annotation map.

**Signature**

```ts
export declare const annotate: (<A>(
  key: TestAnnotation.TestAnnotation<A>,
  value: A
) => (self: TestAnnotationMap) => TestAnnotationMap) &
  (<A>(self: TestAnnotationMap, key: TestAnnotation.TestAnnotation<A>, value: A) => TestAnnotationMap)
```

Added in v1.0.0

## combine

**Signature**

```ts
export declare const combine: ((that: TestAnnotationMap) => (self: TestAnnotationMap) => TestAnnotationMap) &
  ((self: TestAnnotationMap, that: TestAnnotationMap) => TestAnnotationMap)
```

Added in v1.0.0

## empty

**Signature**

```ts
export declare const empty: (_: void) => TestAnnotationMap
```

Added in v1.0.0

## get

Retrieves the annotation of the specified type, or its default value if
there is none.

**Signature**

```ts
export declare const get: (<A>(key: TestAnnotation.TestAnnotation<A>) => (self: TestAnnotationMap) => A) &
  (<A>(self: TestAnnotationMap, key: TestAnnotation.TestAnnotation<A>) => A)
```

Added in v1.0.0

## isTestAnnotationMap

**Signature**

```ts
export declare const isTestAnnotationMap: (u: unknown) => u is TestAnnotationMap
```

Added in v1.0.0

## make

**Signature**

```ts
export declare const make: (map: ReadonlyMap<TestAnnotation.TestAnnotation<unknown>, unknown>) => TestAnnotationMap
```

Added in v1.0.0

## overwrite

**Signature**

```ts
export declare const overwrite: (<A>(
  key: TestAnnotation.TestAnnotation<A>,
  value: A
) => (self: TestAnnotationMap) => TestAnnotationMap) &
  (<A>(self: TestAnnotationMap, key: TestAnnotation.TestAnnotation<A>, value: A) => TestAnnotationMap)
```

Added in v1.0.0

## update

**Signature**

```ts
export declare const update: (<A>(
  key: TestAnnotation.TestAnnotation<A>,
  f: (value: A) => A
) => (self: TestAnnotationMap) => TestAnnotationMap) &
  (<A>(self: TestAnnotationMap, key: TestAnnotation.TestAnnotation<A>, f: (value: A) => A) => TestAnnotationMap)
```

Added in v1.0.0
