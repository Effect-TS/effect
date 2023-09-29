---
title: TestConfig.ts
nav_order: 124
parent: Modules
---

## TestConfig overview

Added in v1.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [utils](#utils)
  - [TestConfig](#testconfig)
  - [TestConfig (interface)](#testconfig-interface)
  - [make](#make)

---

# utils

## TestConfig

**Signature**

```ts
export declare const TestConfig: Context.Tag<TestConfig, TestConfig>
```

Added in v1.0.0

## TestConfig (interface)

The `TestConfig` service provides access to default configuration settings
used by tests, including the number of times to repeat tests to ensure
they are stable, the number of times to retry flaky tests, the sufficient
number of samples to check from a random variable, and the maximum number of
shrinkings to minimize large failures.

**Signature**

```ts
export interface TestConfig {
  /**
   * The number of times to repeat tests to ensure they are stable.
   */
  readonly repeats: number
  /**
   * The number of times to retry flaky tests.
   */
  readonly retries: number
  /**
   * The number of sufficient samples to check for a random variable.
   */
  readonly samples: number
  /**
   * The maximum number of shrinkings to minimize large failures
   */
  readonly shrinks: number
}
```

Added in v1.0.0

## make

**Signature**

```ts
export declare const make: (params: {
  readonly repeats: number
  readonly retries: number
  readonly samples: number
  readonly shrinks: number
}) => TestConfig
```

Added in v1.0.0
