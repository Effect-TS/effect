---
title: RuntimeFlags.ts
nav_order: 93
parent: Modules
---

## RuntimeFlags overview

Added in v2.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [constructors](#constructors)
  - [CooperativeYielding](#cooperativeyielding)
  - [Interruption](#interruption)
  - [None](#none)
  - [OpSupervision](#opsupervision)
  - [RuntimeMetrics](#runtimemetrics)
  - [WindDown](#winddown)
  - [make](#make)
  - [none](#none-1)
- [context](#context)
  - [disableCooperativeYielding](#disablecooperativeyielding)
  - [disableInterruption](#disableinterruption)
  - [disableOpSupervision](#disableopsupervision)
  - [disableRuntimeMetrics](#disableruntimemetrics)
  - [disableWindDown](#disablewinddown)
  - [enableCooperativeYielding](#enablecooperativeyielding)
  - [enableInterruption](#enableinterruption)
  - [enableOpSupervision](#enableopsupervision)
  - [enableRuntimeMetrics](#enableruntimemetrics)
  - [enableWindDown](#enablewinddown)
- [conversions](#conversions)
  - [render](#render)
  - [toSet](#toset)
- [diffing](#diffing)
  - [diff](#diff)
- [elements](#elements)
  - [isDisabled](#isdisabled)
  - [isEnabled](#isenabled)
- [getters](#getters)
  - [cooperativeYielding](#cooperativeyielding-1)
  - [interruptible](#interruptible)
  - [interruption](#interruption-1)
  - [opSupervision](#opsupervision-1)
  - [runtimeMetrics](#runtimemetrics-1)
  - [windDown](#winddown-1)
- [models](#models)
  - [RuntimeFlag (type alias)](#runtimeflag-type-alias)
  - [RuntimeFlags (type alias)](#runtimeflags-type-alias)
- [utils](#utils)
  - [differ](#differ)
  - [disable](#disable)
  - [disableAll](#disableall)
  - [enable](#enable)
  - [enableAll](#enableall)
  - [patch](#patch)

---

# constructors

## CooperativeYielding

The cooperative yielding flag determines whether the Effect runtime will
yield to another fiber.

**Signature**

```ts
export declare const CooperativeYielding: RuntimeFlag
```

Added in v2.0.0

## Interruption

The interruption flag determines whether or not the Effect runtime system will
interrupt a fiber.

**Signature**

```ts
export declare const Interruption: RuntimeFlag
```

Added in v2.0.0

## None

No runtime flags.

**Signature**

```ts
export declare const None: RuntimeFlag
```

Added in v2.0.0

## OpSupervision

The op supervision flag determines whether or not the Effect runtime system
will supervise all operations of the Effect runtime. Use of this flag will
negatively impact performance, but is required for some operations, such as
profiling.

**Signature**

```ts
export declare const OpSupervision: RuntimeFlag
```

Added in v2.0.0

## RuntimeMetrics

The runtime metrics flag determines whether or not the Effect runtime system
will collect metrics about the Effect runtime. Use of this flag will have a
very small negative impact on performance, but generates very helpful
operational insight into running Effect applications that can be exported to
Prometheus or other tools via Effect Metrics.

**Signature**

```ts
export declare const RuntimeMetrics: RuntimeFlag
```

Added in v2.0.0

## WindDown

The wind down flag determines whether the Effect runtime system will execute
effects in wind-down mode. In wind-down mode, even if interruption is
enabled and a fiber has been interrupted, the fiber will continue its
execution uninterrupted.

**Signature**

```ts
export declare const WindDown: RuntimeFlag
```

Added in v2.0.0

## make

**Signature**

```ts
export declare const make: (...flags: ReadonlyArray<RuntimeFlag>) => RuntimeFlags
```

Added in v2.0.0

## none

**Signature**

```ts
export declare const none: RuntimeFlags
```

Added in v2.0.0

# context

## disableCooperativeYielding

**Signature**

```ts
export declare const disableCooperativeYielding: Layer.Layer<never, never, never>
```

Added in v2.0.0

## disableInterruption

**Signature**

```ts
export declare const disableInterruption: Layer.Layer<never, never, never>
```

Added in v2.0.0

## disableOpSupervision

**Signature**

```ts
export declare const disableOpSupervision: Layer.Layer<never, never, never>
```

Added in v2.0.0

## disableRuntimeMetrics

**Signature**

```ts
export declare const disableRuntimeMetrics: Layer.Layer<never, never, never>
```

Added in v2.0.0

## disableWindDown

**Signature**

```ts
export declare const disableWindDown: Layer.Layer<never, never, never>
```

Added in v2.0.0

## enableCooperativeYielding

**Signature**

```ts
export declare const enableCooperativeYielding: Layer.Layer<never, never, never>
```

Added in v2.0.0

## enableInterruption

**Signature**

```ts
export declare const enableInterruption: Layer.Layer<never, never, never>
```

Added in v2.0.0

## enableOpSupervision

**Signature**

```ts
export declare const enableOpSupervision: Layer.Layer<never, never, never>
```

Added in v2.0.0

## enableRuntimeMetrics

**Signature**

```ts
export declare const enableRuntimeMetrics: Layer.Layer<never, never, never>
```

Added in v2.0.0

## enableWindDown

**Signature**

```ts
export declare const enableWindDown: Layer.Layer<never, never, never>
```

Added in v2.0.0

# conversions

## render

Converts the provided `RuntimeFlags` into a `string`.

**Signature**

```ts
export declare const render: (self: RuntimeFlags) => string
```

Added in v2.0.0

## toSet

Converts the provided `RuntimeFlags` into a `ReadonlySet<number>`.

**Signature**

```ts
export declare const toSet: (self: RuntimeFlags) => ReadonlySet<RuntimeFlag>
```

Added in v2.0.0

# diffing

## diff

Creates a `RuntimeFlagsPatch` which describes the difference between `self`
and `that`.

**Signature**

```ts
export declare const diff: {
  (that: RuntimeFlags): (self: RuntimeFlags) => RuntimeFlagsPatch.RuntimeFlagsPatch
  (self: RuntimeFlags, that: RuntimeFlags): RuntimeFlagsPatch.RuntimeFlagsPatch
}
```

Added in v2.0.0

# elements

## isDisabled

Returns `true` if the specified `RuntimeFlag` is disabled, `false` otherwise.

**Signature**

```ts
export declare const isDisabled: {
  (flag: RuntimeFlag): (self: RuntimeFlags) => boolean
  (self: RuntimeFlags, flag: RuntimeFlag): boolean
}
```

Added in v2.0.0

## isEnabled

Returns `true` if the specified `RuntimeFlag` is enabled, `false` otherwise.

**Signature**

```ts
export declare const isEnabled: {
  (flag: RuntimeFlag): (self: RuntimeFlags) => boolean
  (self: RuntimeFlags, flag: RuntimeFlag): boolean
}
```

Added in v2.0.0

# getters

## cooperativeYielding

Returns `true` if the `CooperativeYielding` `RuntimeFlag` is enabled, `false`
otherwise.

**Signature**

```ts
export declare const cooperativeYielding: (self: RuntimeFlags) => boolean
```

Added in v2.0.0

## interruptible

Returns true only if the `Interruption` flag is **enabled** and the
`WindDown` flag is **disabled**.

A fiber is said to be interruptible if interruption is enabled and the fiber
is not in its wind-down phase, in which it takes care of cleanup activities
related to fiber shutdown.

**Signature**

```ts
export declare const interruptible: (self: RuntimeFlags) => boolean
```

Added in v2.0.0

## interruption

Returns `true` if the `Interruption` `RuntimeFlag` is enabled, `false`
otherwise.

**Signature**

```ts
export declare const interruption: (self: RuntimeFlags) => boolean
```

Added in v2.0.0

## opSupervision

Returns `true` if the `OpSupervision` `RuntimeFlag` is enabled, `false`
otherwise.

**Signature**

```ts
export declare const opSupervision: (self: RuntimeFlags) => boolean
```

Added in v2.0.0

## runtimeMetrics

Returns `true` if the `RuntimeMetrics` `RuntimeFlag` is enabled, `false`
otherwise.

**Signature**

```ts
export declare const runtimeMetrics: (self: RuntimeFlags) => boolean
```

Added in v2.0.0

## windDown

Returns `true` if the `WindDown` `RuntimeFlag` is enabled, `false`
otherwise.

**Signature**

```ts
export declare const windDown: (self: RuntimeFlags) => boolean
```

Added in v2.0.0

# models

## RuntimeFlag (type alias)

Represents a flag that can be set to enable or disable a particular feature
of the Effect runtime.

**Signature**

```ts
export type RuntimeFlag = number & {
  readonly RuntimeFlag: unique symbol
}
```

Added in v2.0.0

## RuntimeFlags (type alias)

Represents a set of `RuntimeFlag`s. `RuntimeFlag`s affect the operation of
the Effect runtime system. They are exposed to application-level code because
they affect the behavior and performance of application code.

**Signature**

```ts
export type RuntimeFlags = number & {
  readonly RuntimeFlags: unique symbol
}
```

Added in v2.0.0

# utils

## differ

Constructs a differ that knows how to diff `RuntimeFlags` values.

**Signature**

```ts
export declare const differ: Differ.Differ<RuntimeFlags, RuntimeFlagsPatch.RuntimeFlagsPatch>
```

Added in v2.0.0

## disable

Disables the specified `RuntimeFlag`.

**Signature**

```ts
export declare const disable: {
  (flag: RuntimeFlag): (self: RuntimeFlags) => RuntimeFlags
  (self: RuntimeFlags, flag: RuntimeFlag): RuntimeFlags
}
```

Added in v2.0.0

## disableAll

Disables all of the `RuntimeFlag`s in the specified set of `RuntimeFlags`.

**Signature**

```ts
export declare const disableAll: {
  (flags: RuntimeFlags): (self: RuntimeFlags) => RuntimeFlags
  (self: RuntimeFlags, flags: RuntimeFlags): RuntimeFlags
}
```

Added in v2.0.0

## enable

Enables the specified `RuntimeFlag`.

**Signature**

```ts
export declare const enable: {
  (flag: RuntimeFlag): (self: RuntimeFlags) => RuntimeFlags
  (self: RuntimeFlags, flag: RuntimeFlag): RuntimeFlags
}
```

Added in v2.0.0

## enableAll

Enables all of the `RuntimeFlag`s in the specified set of `RuntimeFlags`.

**Signature**

```ts
export declare const enableAll: {
  (flags: RuntimeFlags): (self: RuntimeFlags) => RuntimeFlags
  (self: RuntimeFlags, flags: RuntimeFlags): RuntimeFlags
}
```

Added in v2.0.0

## patch

Patches a set of `RuntimeFlag`s with a `RuntimeFlagsPatch`, returning the
patched set of `RuntimeFlag`s.

**Signature**

```ts
export declare const patch: {
  (patch: RuntimeFlagsPatch.RuntimeFlagsPatch): (self: RuntimeFlags) => RuntimeFlags
  (self: RuntimeFlags, patch: RuntimeFlagsPatch.RuntimeFlagsPatch): RuntimeFlags
}
```

Added in v2.0.0
