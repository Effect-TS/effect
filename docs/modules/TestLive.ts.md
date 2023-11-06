---
title: TestLive.ts
nav_order: 126
parent: Modules
---

## TestLive overview

Added in v2.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [utils](#utils)
  - [TestLive](#testlive)
  - [TestLive (interface)](#testlive-interface)
  - [TestLiveTypeId](#testlivetypeid)
  - [TestLiveTypeId (type alias)](#testlivetypeid-type-alias)
  - [make](#make)

---

# utils

## TestLive

**Signature**

```ts
export declare const TestLive: Context.Tag<TestLive, TestLive>
```

Added in v2.0.0

## TestLive (interface)

The `Live` trait provides access to the "live" default Effect services from
within tests for workflows such as printing test results to the console or
timing out tests where it is necessary to access the real implementations of
these services.

**Signature**

```ts
export interface TestLive {
  readonly [TestLiveTypeId]: TestLiveTypeId
  provide<R, E, A>(effect: Effect<R, E, A>): Effect<R, E, A>
}
```

Added in v2.0.0

## TestLiveTypeId

**Signature**

```ts
export declare const TestLiveTypeId: typeof TestLiveTypeId
```

Added in v2.0.0

## TestLiveTypeId (type alias)

**Signature**

```ts
export type TestLiveTypeId = typeof TestLiveTypeId
```

Added in v2.0.0

## make

**Signature**

```ts
export declare const make: (services: Context.Context<DefaultServices.DefaultServices>) => TestLive
```

Added in v2.0.0
