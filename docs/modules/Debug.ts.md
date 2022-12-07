---
title: Debug.ts
nav_order: 2
parent: Modules
---

## Debug overview

Added in v2.0.0

```md
- Docs: https://effect-ts.github.io/io/modules/Debug.ts.html
- Module: "@effect/io/Debug"
```

---

<h2 class="text-delta">Table of contents</h2>

- [utils](#utils)
  - [Debug](#debug)
  - [getCallTrace](#getcalltrace)
  - [getCallTraceFromNewError](#getcalltracefromnewerror)
  - [isTraceEnabled](#istraceenabled)
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

## getCallTraceFromNewError

**Signature**

```ts
export declare const getCallTraceFromNewError: (at: number) => string | undefined
```

Added in v2.0.0

## isTraceEnabled

**Signature**

```ts
export declare const isTraceEnabled: () => boolean
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
