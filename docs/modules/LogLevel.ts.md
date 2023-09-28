---
title: LogLevel.ts
nav_order: 57
parent: Modules
---

## LogLevel overview

Added in v1.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [constructors](#constructors)
  - [All](#all)
  - [Debug](#debug)
  - [Error](#error)
  - [Fatal](#fatal)
  - [Info](#info)
  - [None](#none)
  - [Trace](#trace)
  - [Warning](#warning)
  - [allLevels](#alllevels)
- [conversions](#conversions)
  - [fromLiteral](#fromliteral)
- [instances](#instances)
  - [Order](#order)
- [model](#model)
  - [All (interface)](#all-interface)
  - [Debug (interface)](#debug-interface)
  - [Error (interface)](#error-interface)
  - [Fatal (interface)](#fatal-interface)
  - [Info (interface)](#info-interface)
  - [Literal (type alias)](#literal-type-alias)
  - [LogLevel (type alias)](#loglevel-type-alias)
  - [None (interface)](#none-interface)
  - [Trace (interface)](#trace-interface)
  - [Warning (interface)](#warning-interface)
- [ordering](#ordering)
  - [greaterThan](#greaterthan)
  - [greaterThanEqual](#greaterthanequal)
  - [lessThan](#lessthan)
  - [lessThanEqual](#lessthanequal)
- [utils](#utils)
  - [locally](#locally)

---

# constructors

## All

**Signature**

```ts
export declare const All: LogLevel
```

Added in v1.0.0

## Debug

**Signature**

```ts
export declare const Debug: LogLevel
```

Added in v1.0.0

## Error

**Signature**

```ts
export declare const Error: LogLevel
```

Added in v1.0.0

## Fatal

**Signature**

```ts
export declare const Fatal: LogLevel
```

Added in v1.0.0

## Info

**Signature**

```ts
export declare const Info: LogLevel
```

Added in v1.0.0

## None

**Signature**

```ts
export declare const None: LogLevel
```

Added in v1.0.0

## Trace

**Signature**

```ts
export declare const Trace: LogLevel
```

Added in v1.0.0

## Warning

**Signature**

```ts
export declare const Warning: LogLevel
```

Added in v1.0.0

## allLevels

**Signature**

```ts
export declare const allLevels: readonly LogLevel[]
```

Added in v1.0.0

# conversions

## fromLiteral

**Signature**

```ts
export declare const fromLiteral: (_: Literal) => LogLevel
```

Added in v1.0.0

# instances

## Order

**Signature**

```ts
export declare const Order: order.Order<LogLevel>
```

Added in v1.0.0

# model

## All (interface)

**Signature**

```ts
export interface All extends Pipeable {
  readonly _tag: 'All'
  readonly label: 'ALL'
  readonly syslog: 0
  readonly ordinal: number
}
```

Added in v1.0.0

## Debug (interface)

**Signature**

```ts
export interface Debug extends Pipeable {
  readonly _tag: 'Debug'
  readonly label: 'DEBUG'
  readonly syslog: 7
  readonly ordinal: number
}
```

Added in v1.0.0

## Error (interface)

**Signature**

```ts
export interface Error extends Pipeable {
  readonly _tag: 'Error'
  readonly label: 'ERROR'
  readonly syslog: 3
  readonly ordinal: number
}
```

Added in v1.0.0

## Fatal (interface)

**Signature**

```ts
export interface Fatal extends Pipeable {
  readonly _tag: 'Fatal'
  readonly label: 'FATAL'
  readonly syslog: 2
  readonly ordinal: number
}
```

Added in v1.0.0

## Info (interface)

**Signature**

```ts
export interface Info extends Pipeable {
  readonly _tag: 'Info'
  readonly label: 'INFO'
  readonly syslog: 6
  readonly ordinal: number
}
```

Added in v1.0.0

## Literal (type alias)

**Signature**

```ts
export type Literal = LogLevel['_tag']
```

Added in v1.0.0

## LogLevel (type alias)

A `LogLevel` represents the log level associated with an individual logging
operation. Log levels are used both to describe the granularity (or
importance) of individual log statements, as well as to enable tuning
verbosity of log output.

**Signature**

```ts
export type LogLevel = All | Fatal | Error | Warning | Info | Debug | Trace | None
```

Added in v1.0.0

## None (interface)

**Signature**

```ts
export interface None extends Pipeable {
  readonly _tag: 'None'
  readonly label: 'OFF'
  readonly syslog: 7
  readonly ordinal: number
}
```

Added in v1.0.0

## Trace (interface)

**Signature**

```ts
export interface Trace extends Pipeable {
  readonly _tag: 'Trace'
  readonly label: 'TRACE'
  readonly syslog: 7
  readonly ordinal: number
}
```

Added in v1.0.0

## Warning (interface)

**Signature**

```ts
export interface Warning extends Pipeable {
  readonly _tag: 'Warning'
  readonly label: 'WARN'
  readonly syslog: 4
  readonly ordinal: number
}
```

Added in v1.0.0

# ordering

## greaterThan

**Signature**

```ts
export declare const greaterThan: {
  (that: LogLevel): (self: LogLevel) => boolean
  (self: LogLevel, that: LogLevel): boolean
}
```

Added in v1.0.0

## greaterThanEqual

**Signature**

```ts
export declare const greaterThanEqual: {
  (that: LogLevel): (self: LogLevel) => boolean
  (self: LogLevel, that: LogLevel): boolean
}
```

Added in v1.0.0

## lessThan

**Signature**

```ts
export declare const lessThan: {
  (that: LogLevel): (self: LogLevel) => boolean
  (self: LogLevel, that: LogLevel): boolean
}
```

Added in v1.0.0

## lessThanEqual

**Signature**

```ts
export declare const lessThanEqual: {
  (that: LogLevel): (self: LogLevel) => boolean
  (self: LogLevel, that: LogLevel): boolean
}
```

Added in v1.0.0

# utils

## locally

Locally applies the specified `LogLevel` to an `Effect` workflow, reverting
to the previous `LogLevel` after the `Effect` workflow completes.

**Signature**

```ts
export declare const locally: {
  (self: LogLevel): <R, E, B>(use: Effect.Effect<R, E, B>) => Effect.Effect<R, E, B>
  <R, E, B>(use: Effect.Effect<R, E, B>, self: LogLevel): Effect.Effect<R, E, B>
}
```

Added in v1.0.0
