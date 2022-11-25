---
title: Debug.ts
nav_order: 1
parent: Modules
---

## Debug overview

Added in v2.0.0

Docs: https://effect-ts.github.io/io/modules/Debug.ts.html
Module: @effect/io/Debug

---

<h2 class="text-delta">Table of contents</h2>

- [utils](#utils)
  - [Debug](#debug)
  - [getCallTrace](#getcalltrace)
  - [nodeSourceMapExtractor](#nodesourcemapextractor)
  - [runtimeDebug](#runtimedebug)
  - [withCallTrace](#withcalltrace)

---

# utils

## Debug

**Signature**

```ts
export declare const Debug: any
```

Added in v2.0.0

## getCallTrace

**Signature**

```ts
export declare const getCallTrace: () => string | undefined
```

Added in v2.0.0

## nodeSourceMapExtractor

**Signature**

```ts
export declare const nodeSourceMapExtractor: (at: number) => string | undefined
```

Added in v2.0.0

## runtimeDebug

**Signature**

```ts
export declare const runtimeDebug: Debug
```

Added in v2.0.0

## withCallTrace

**Signature**

```ts
export declare const withCallTrace: (trace: string) => <A>(value: A) => A
```

Added in v2.0.0
