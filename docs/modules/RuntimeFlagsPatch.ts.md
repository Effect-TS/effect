---
title: RuntimeFlagsPatch.ts
nav_order: 93
parent: Modules
---

## RuntimeFlagsPatch overview

Added in v1.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [constructors](#constructors)
  - [disable](#disable)
  - [empty](#empty)
  - [enable](#enable)
  - [make](#make)
- [destructors](#destructors)
  - [disabledSet](#disabledset)
  - [enabledSet](#enabledset)
  - [render](#render)
- [elements](#elements)
  - [includes](#includes)
  - [isActive](#isactive)
  - [isDisabled](#isdisabled)
  - [isEnabled](#isenabled)
- [getters](#getters)
  - [isEmpty](#isempty)
- [models](#models)
  - [RuntimeFlagsPatch (type alias)](#runtimeflagspatch-type-alias)
- [utils](#utils)
  - [andThen](#andthen)
  - [both](#both)
  - [either](#either)
  - [exclude](#exclude)
  - [inverse](#inverse)

---

# constructors

## disable

Creates a `RuntimeFlagsPatch` describing disabling the provided `RuntimeFlag`.

**Signature**

```ts
export declare const disable: (flag: RuntimeFlags.RuntimeFlag) => RuntimeFlagsPatch
```

Added in v1.0.0

## empty

The empty `RuntimeFlagsPatch`.

**Signature**

```ts
export declare const empty: RuntimeFlagsPatch
```

Added in v1.0.0

## enable

Creates a `RuntimeFlagsPatch` describing enabling the provided `RuntimeFlag`.

**Signature**

```ts
export declare const enable: (flag: RuntimeFlags.RuntimeFlag) => RuntimeFlagsPatch
```

Added in v1.0.0

## make

**Signature**

```ts
export declare const make: (active: number, enabled: number) => RuntimeFlagsPatch
```

Added in v1.0.0

# destructors

## disabledSet

Returns a `ReadonlySet<number>` containing the `RuntimeFlags` described as
disabled by the specified `RuntimeFlagsPatch`.

**Signature**

```ts
export declare const disabledSet: (self: RuntimeFlagsPatch) => ReadonlySet<RuntimeFlags.RuntimeFlag>
```

Added in v1.0.0

## enabledSet

Returns a `ReadonlySet<number>` containing the `RuntimeFlags` described as
enabled by the specified `RuntimeFlagsPatch`.

**Signature**

```ts
export declare const enabledSet: (self: RuntimeFlagsPatch) => ReadonlySet<RuntimeFlags.RuntimeFlag>
```

Added in v1.0.0

## render

Renders the provided `RuntimeFlagsPatch` to a string.

**Signature**

```ts
export declare const render: (self: RuntimeFlagsPatch) => string
```

Added in v1.0.0

# elements

## includes

Returns `true` if the `RuntimeFlagsPatch` includes the specified
`RuntimeFlag`, `false` otherwise.

**Signature**

```ts
export declare const includes: {
  (flag: RuntimeFlagsPatch): (self: RuntimeFlagsPatch) => boolean
  (self: RuntimeFlagsPatch, flag: RuntimeFlagsPatch): boolean
}
```

Added in v1.0.0

## isActive

Returns `true` if the `RuntimeFlagsPatch` describes the specified
`RuntimeFlag` as active.

**Signature**

```ts
export declare const isActive: {
  (flag: RuntimeFlagsPatch): (self: RuntimeFlagsPatch) => boolean
  (self: RuntimeFlagsPatch, flag: RuntimeFlagsPatch): boolean
}
```

Added in v1.0.0

## isDisabled

Returns `true` if the `RuntimeFlagsPatch` describes the specified
`RuntimeFlag` as disabled.

**Signature**

```ts
export declare const isDisabled: {
  (flag: RuntimeFlags.RuntimeFlag): (self: RuntimeFlagsPatch) => boolean
  (self: RuntimeFlagsPatch, flag: RuntimeFlags.RuntimeFlag): boolean
}
```

Added in v1.0.0

## isEnabled

Returns `true` if the `RuntimeFlagsPatch` describes the specified
`RuntimeFlag` as enabled.

**Signature**

```ts
export declare const isEnabled: {
  (flag: RuntimeFlags.RuntimeFlag): (self: RuntimeFlagsPatch) => boolean
  (self: RuntimeFlagsPatch, flag: RuntimeFlags.RuntimeFlag): boolean
}
```

Added in v1.0.0

# getters

## isEmpty

Returns `true` if the specified `RuntimeFlagsPatch` is empty.

**Signature**

```ts
export declare const isEmpty: (patch: RuntimeFlagsPatch) => boolean
```

Added in v1.0.0

# models

## RuntimeFlagsPatch (type alias)

**Signature**

```ts
export type RuntimeFlagsPatch = number & {
  readonly RuntimeFlagsPatch: unique symbol
}
```

Added in v1.0.0

# utils

## andThen

Creates a `RuntimeFlagsPatch` describing the application of the `self` patch,
followed by `that` patch.

**Signature**

```ts
export declare const andThen: {
  (that: RuntimeFlagsPatch): (self: RuntimeFlagsPatch) => RuntimeFlagsPatch
  (self: RuntimeFlagsPatch, that: RuntimeFlagsPatch): RuntimeFlagsPatch
}
```

Added in v1.0.0

## both

Creates a `RuntimeFlagsPatch` describing application of both the `self` patch
and `that` patch.

**Signature**

```ts
export declare const both: {
  (that: RuntimeFlagsPatch): (self: RuntimeFlagsPatch) => RuntimeFlagsPatch
  (self: RuntimeFlagsPatch, that: RuntimeFlagsPatch): RuntimeFlagsPatch
}
```

Added in v1.0.0

## either

Creates a `RuntimeFlagsPatch` describing application of either the `self`
patch or `that` patch.

**Signature**

```ts
export declare const either: {
  (that: RuntimeFlagsPatch): (self: RuntimeFlagsPatch) => RuntimeFlagsPatch
  (self: RuntimeFlagsPatch, that: RuntimeFlagsPatch): RuntimeFlagsPatch
}
```

Added in v1.0.0

## exclude

Creates a `RuntimeFlagsPatch` which describes exclusion of the specified
`RuntimeFlag` from the set of `RuntimeFlags`.

**Signature**

```ts
export declare const exclude: {
  (flag: RuntimeFlags.RuntimeFlag): (self: RuntimeFlagsPatch) => RuntimeFlagsPatch
  (self: RuntimeFlagsPatch, flag: RuntimeFlags.RuntimeFlag): RuntimeFlagsPatch
}
```

Added in v1.0.0

## inverse

Creates a `RuntimeFlagsPatch` which describes the inverse of the patch
specified by the provided `RuntimeFlagsPatch`.

**Signature**

```ts
export declare const inverse: (patch: RuntimeFlagsPatch) => RuntimeFlagsPatch
```

Added in v1.0.0
