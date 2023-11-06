---
title: TestSized.ts
nav_order: 128
parent: Modules
---

## TestSized overview

Added in v2.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [utils](#utils)
  - [TestSized](#testsized)
  - [TestSized (interface)](#testsized-interface)
  - [TestSizedTypeId](#testsizedtypeid)
  - [TestSizedTypeId (type alias)](#testsizedtypeid-type-alias)
  - [fromFiberRef](#fromfiberref)
  - [make](#make)

---

# utils

## TestSized

**Signature**

```ts
export declare const TestSized: Context.Tag<TestSized, TestSized>
```

Added in v2.0.0

## TestSized (interface)

**Signature**

```ts
export interface TestSized {
  readonly [TestSizedTypeId]: TestSizedTypeId
  readonly fiberRef: FiberRef.FiberRef<number>
  size(): Effect<never, never, number>
  withSize(size: number): <R, E, A>(effect: Effect<R, E, A>) => Effect<R, E, A>
}
```

Added in v2.0.0

## TestSizedTypeId

**Signature**

```ts
export declare const TestSizedTypeId: typeof TestSizedTypeId
```

Added in v2.0.0

## TestSizedTypeId (type alias)

**Signature**

```ts
export type TestSizedTypeId = typeof TestSizedTypeId
```

Added in v2.0.0

## fromFiberRef

**Signature**

```ts
export declare const fromFiberRef: (fiberRef: FiberRef.FiberRef<number>) => TestSized
```

Added in v2.0.0

## make

**Signature**

```ts
export declare const make: (size: number) => TestSized
```

Added in v2.0.0
