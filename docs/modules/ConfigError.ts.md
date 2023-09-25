---
title: ConfigError.ts
nav_order: 9
parent: Modules
---

## ConfigError overview

Added in v1.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [constructors](#constructors)
  - [And](#and)
  - [InvalidData](#invaliddata)
  - [MissingData](#missingdata)
  - [Or](#or)
  - [SourceUnavailable](#sourceunavailable)
  - [Unsupported](#unsupported)
- [folding](#folding)
  - [reduceWithContext](#reducewithcontext)
- [models](#models)
  - [And (interface)](#and-interface)
  - [ConfigError (type alias)](#configerror-type-alias)
  - [ConfigErrorReducer (interface)](#configerrorreducer-interface)
  - [InvalidData (interface)](#invaliddata-interface)
  - [MissingData (interface)](#missingdata-interface)
  - [Options (interface)](#options-interface)
  - [Or (interface)](#or-interface)
  - [SourceUnavailable (interface)](#sourceunavailable-interface)
  - [Unsupported (interface)](#unsupported-interface)
- [refinements](#refinements)
  - [isAnd](#isand)
  - [isConfigError](#isconfigerror)
  - [isInvalidData](#isinvaliddata)
  - [isMissingData](#ismissingdata)
  - [isOr](#isor)
  - [isSourceUnavailable](#issourceunavailable)
  - [isUnsupported](#isunsupported)
- [symbols](#symbols)
  - [ConfigErrorTypeId](#configerrortypeid)
  - [ConfigErrorTypeId (type alias)](#configerrortypeid-type-alias)
- [utils](#utils)
  - [ConfigError (namespace)](#configerror-namespace)
    - [Proto (interface)](#proto-interface)
    - [Reducer (type alias)](#reducer-type-alias)
  - [isMissingDataOnly](#ismissingdataonly)
  - [prefixed](#prefixed)

---

# constructors

## And

**Signature**

```ts
export declare const And: (self: ConfigError, that: ConfigError) => ConfigError
```

Added in v1.0.0

## InvalidData

**Signature**

```ts
export declare const InvalidData: (path: Array<string>, message: string, options?: Options) => ConfigError
```

Added in v1.0.0

## MissingData

**Signature**

```ts
export declare const MissingData: (path: Array<string>, message: string, options?: Options) => ConfigError
```

Added in v1.0.0

## Or

**Signature**

```ts
export declare const Or: (self: ConfigError, that: ConfigError) => ConfigError
```

Added in v1.0.0

## SourceUnavailable

**Signature**

```ts
export declare const SourceUnavailable: (
  path: Array<string>,
  message: string,
  cause: Cause.Cause<unknown>,
  options?: Options
) => ConfigError
```

Added in v1.0.0

## Unsupported

**Signature**

```ts
export declare const Unsupported: (path: Array<string>, message: string, options?: Options) => ConfigError
```

Added in v1.0.0

# folding

## reduceWithContext

**Signature**

```ts
export declare const reduceWithContext: {
  <C, Z>(context: C, reducer: ConfigErrorReducer<C, Z>): (self: ConfigError) => Z
  <C, Z>(self: ConfigError, context: C, reducer: ConfigErrorReducer<C, Z>): Z
}
```

Added in v1.0.0

# models

## And (interface)

**Signature**

```ts
export interface And extends ConfigError.Proto {
  readonly _tag: 'And'
  readonly left: ConfigError
  readonly right: ConfigError
}
```

Added in v1.0.0

## ConfigError (type alias)

The possible ways that loading configuration data may fail.

**Signature**

```ts
export type ConfigError = And | Or | InvalidData | MissingData | SourceUnavailable | Unsupported
```

Added in v1.0.0

## ConfigErrorReducer (interface)

**Signature**

```ts
export interface ConfigErrorReducer<C, Z> {
  readonly andCase: (context: C, left: Z, right: Z) => Z
  readonly orCase: (context: C, left: Z, right: Z) => Z
  readonly invalidDataCase: (context: C, path: Array<string>, message: string) => Z
  readonly missingDataCase: (context: C, path: Array<string>, message: string) => Z
  readonly sourceUnavailableCase: (context: C, path: Array<string>, message: string, cause: Cause.Cause<unknown>) => Z
  readonly unsupportedCase: (context: C, path: Array<string>, message: string) => Z
}
```

Added in v1.0.0

## InvalidData (interface)

**Signature**

```ts
export interface InvalidData extends ConfigError.Proto {
  readonly _tag: 'InvalidData'
  readonly path: Array<string>
  readonly message: string
}
```

Added in v1.0.0

## MissingData (interface)

**Signature**

```ts
export interface MissingData extends ConfigError.Proto {
  readonly _tag: 'MissingData'
  readonly path: Array<string>
  readonly message: string
}
```

Added in v1.0.0

## Options (interface)

**Signature**

```ts
export interface Options {
  pathDelim: string
}
```

Added in v1.0.0

## Or (interface)

**Signature**

```ts
export interface Or extends ConfigError.Proto {
  readonly _tag: 'Or'
  readonly left: ConfigError
  readonly right: ConfigError
}
```

Added in v1.0.0

## SourceUnavailable (interface)

**Signature**

```ts
export interface SourceUnavailable extends ConfigError.Proto {
  readonly _tag: 'SourceUnavailable'
  readonly path: Array<string>
  readonly message: string
  readonly cause: Cause.Cause<unknown>
}
```

Added in v1.0.0

## Unsupported (interface)

**Signature**

```ts
export interface Unsupported extends ConfigError.Proto {
  readonly _tag: 'Unsupported'
  readonly path: Array<string>
  readonly message: string
}
```

Added in v1.0.0

# refinements

## isAnd

Returns `true` if the specified `ConfigError` is an `And`, `false` otherwise.

**Signature**

```ts
export declare const isAnd: (self: ConfigError) => self is And
```

Added in v1.0.0

## isConfigError

Returns `true` if the specified value is a `ConfigError`, `false` otherwise.

**Signature**

```ts
export declare const isConfigError: (u: unknown) => u is ConfigError
```

Added in v1.0.0

## isInvalidData

Returns `true` if the specified `ConfigError` is an `InvalidData`, `false`
otherwise.

**Signature**

```ts
export declare const isInvalidData: (self: ConfigError) => self is InvalidData
```

Added in v1.0.0

## isMissingData

Returns `true` if the specified `ConfigError` is an `MissingData`, `false`
otherwise.

**Signature**

```ts
export declare const isMissingData: (self: ConfigError) => self is MissingData
```

Added in v1.0.0

## isOr

Returns `true` if the specified `ConfigError` is an `Or`, `false` otherwise.

**Signature**

```ts
export declare const isOr: (self: ConfigError) => self is Or
```

Added in v1.0.0

## isSourceUnavailable

Returns `true` if the specified `ConfigError` is a `SourceUnavailable`,
`false` otherwise.

**Signature**

```ts
export declare const isSourceUnavailable: (self: ConfigError) => self is SourceUnavailable
```

Added in v1.0.0

## isUnsupported

Returns `true` if the specified `ConfigError` is an `Unsupported`, `false`
otherwise.

**Signature**

```ts
export declare const isUnsupported: (self: ConfigError) => self is Unsupported
```

Added in v1.0.0

# symbols

## ConfigErrorTypeId

**Signature**

```ts
export declare const ConfigErrorTypeId: typeof ConfigErrorTypeId
```

Added in v1.0.0

## ConfigErrorTypeId (type alias)

**Signature**

```ts
export type ConfigErrorTypeId = typeof ConfigErrorTypeId
```

Added in v1.0.0

# utils

## ConfigError (namespace)

Added in v1.0.0

### Proto (interface)

**Signature**

```ts
export interface Proto {
  readonly [ConfigErrorTypeId]: ConfigErrorTypeId
}
```

Added in v1.0.0

### Reducer (type alias)

**Signature**

```ts
export type Reducer<C, Z> = ConfigErrorReducer<C, Z>
```

Added in v1.0.0

## isMissingDataOnly

Returns `true` if the specified `ConfigError` contains only `MissingData` errors, `false` otherwise.

**Signature**

```ts
export declare const isMissingDataOnly: (self: ConfigError) => boolean
```

Added in v1.0.0

## prefixed

**Signature**

```ts
export declare const prefixed: {
  (prefix: Array<string>): (self: ConfigError) => ConfigError
  (self: ConfigError, prefix: Array<string>): ConfigError
}
```

Added in v1.0.0
