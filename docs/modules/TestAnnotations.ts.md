---
title: TestAnnotations.ts
nav_order: 122
parent: Modules
---

## TestAnnotations overview

Added in v2.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [utils](#utils)
  - [TestAnnotations](#testannotations)
  - [TestAnnotations (interface)](#testannotations-interface)
  - [TestAnnotationsTypeId](#testannotationstypeid)
  - [TestAnnotationsTypeId (type alias)](#testannotationstypeid-type-alias)
  - [isTestAnnotations](#istestannotations)
  - [make](#make)

---

# utils

## TestAnnotations

**Signature**

```ts
export declare const TestAnnotations: Context.Tag<TestAnnotations, TestAnnotations>
```

Added in v2.0.0

## TestAnnotations (interface)

The `Annotations` trait provides access to an annotation map that tests can
add arbitrary annotations to. Each annotation consists of a string
identifier, an initial value, and a function for combining two values.
Annotations form monoids and you can think of `Annotations` as a more
structured logging service or as a super polymorphic version of the writer
monad effect.

**Signature**

```ts
export interface TestAnnotations {
  readonly [TestAnnotationsTypeId]: TestAnnotationsTypeId

  readonly ref: Ref.Ref<TestAnnotationMap.TestAnnotationMap>

  /**
   * Accesses an `Annotations` instance in the context and retrieves the
   * annotation of the specified type, or its default value if there is none.
   */
  get<A>(key: TestAnnotation.TestAnnotation<A>): Effect<never, never, A>

  /**
   * Accesses an `Annotations` instance in the context and appends the
   * specified annotation to the annotation map.
   */
  annotate<A>(key: TestAnnotation.TestAnnotation<A>, value: A): Effect<never, never, void>

  /**
   * Returns the set of all fibers in this test.
   */
  supervisedFibers(): Effect<never, never, SortedSet.SortedSet<Fiber.RuntimeFiber<unknown, unknown>>>
}
```

Added in v2.0.0

## TestAnnotationsTypeId

**Signature**

```ts
export declare const TestAnnotationsTypeId: typeof TestAnnotationsTypeId
```

Added in v2.0.0

## TestAnnotationsTypeId (type alias)

**Signature**

```ts
export type TestAnnotationsTypeId = typeof TestAnnotationsTypeId
```

Added in v2.0.0

## isTestAnnotations

**Signature**

```ts
export declare const isTestAnnotations: (u: unknown) => u is TestAnnotations
```

Added in v2.0.0

## make

**Signature**

```ts
export declare const make: (ref: Ref.Ref<TestAnnotationMap.TestAnnotationMap>) => TestAnnotations
```

Added in v2.0.0
