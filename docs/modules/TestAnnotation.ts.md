---
title: TestAnnotation.ts
nav_order: 120
parent: Modules
---

## TestAnnotation overview

Added in v2.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [utils](#utils)
  - [TestAnnotation (interface)](#testannotation-interface)
  - [TestAnnotationTypeId](#testannotationtypeid)
  - [TestAnnotationTypeId (type alias)](#testannotationtypeid-type-alias)
  - [compose](#compose)
  - [fibers](#fibers)
  - [ignored](#ignored)
  - [isTestAnnotation](#istestannotation)
  - [make](#make)
  - [repeated](#repeated)
  - [retried](#retried)
  - [tagged](#tagged)

---

# utils

## TestAnnotation (interface)

**Signature**

```ts
export interface TestAnnotation<A> extends Equal.Equal {
  readonly [TestAnnotationTypeId]: TestAnnotationTypeId
  readonly identifier: string
  readonly tag: Context.Tag<A, A>
  readonly initial: A
  readonly combine: (a: A, b: A) => A
}
```

Added in v2.0.0

## TestAnnotationTypeId

**Signature**

```ts
export declare const TestAnnotationTypeId: typeof TestAnnotationTypeId
```

Added in v2.0.0

## TestAnnotationTypeId (type alias)

**Signature**

```ts
export type TestAnnotationTypeId = typeof TestAnnotationTypeId
```

Added in v2.0.0

## compose

**Signature**

```ts
export declare const compose: <A>(
  left: Either<number, Chunk.Chunk<A>>,
  right: Either<number, Chunk.Chunk<A>>
) => Either<number, Chunk.Chunk<A>>
```

Added in v2.0.0

## fibers

**Signature**

```ts
export declare const fibers: TestAnnotation<
  Either<number, Chunk.Chunk<MutableRef.MutableRef<SortedSet.SortedSet<Fiber.RuntimeFiber<unknown, unknown>>>>>
>
```

Added in v2.0.0

## ignored

An annotation which counts ignored tests.

**Signature**

```ts
export declare const ignored: TestAnnotation<number>
```

Added in v2.0.0

## isTestAnnotation

**Signature**

```ts
export declare const isTestAnnotation: (u: unknown) => u is TestAnnotation<unknown>
```

Added in v2.0.0

## make

**Signature**

```ts
export declare const make: <A>(
  identifier: string,
  tag: Context.Tag<A, A>,
  initial: A,
  combine: (a: A, b: A) => A
) => TestAnnotation<A>
```

Added in v2.0.0

## repeated

An annotation which counts repeated tests.

**Signature**

```ts
export declare const repeated: TestAnnotation<number>
```

Added in v2.0.0

## retried

An annotation which counts retried tests.

**Signature**

```ts
export declare const retried: TestAnnotation<number>
```

Added in v2.0.0

## tagged

An annotation which tags tests with strings.

**Signature**

```ts
export declare const tagged: TestAnnotation<HashSet.HashSet<string>>
```

Added in v2.0.0
