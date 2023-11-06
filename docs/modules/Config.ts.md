---
title: Config.ts
nav_order: 11
parent: Modules
---

## Config overview

Added in v2.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [constructors](#constructors)
  - [all](#all)
  - [array](#array)
  - [boolean](#boolean)
  - [chunk](#chunk)
  - [date](#date)
  - [fail](#fail)
  - [hashMap](#hashmap)
  - [hashSet](#hashset)
  - [integer](#integer)
  - [logLevel](#loglevel)
  - [number](#number)
  - [primitive](#primitive)
  - [secret](#secret)
  - [string](#string)
  - [succeed](#succeed)
  - [suspend](#suspend)
  - [sync](#sync)
  - [unwrap](#unwrap)
- [models](#models)
  - [Config (interface)](#config-interface)
- [refinements](#refinements)
  - [isConfig](#isconfig)
- [symbols](#symbols)
  - [ConfigTypeId](#configtypeid)
  - [ConfigTypeId (type alias)](#configtypeid-type-alias)
- [utils](#utils)
  - [Config (namespace)](#config-namespace)
    - [Primitive (interface)](#primitive-interface)
    - [Variance (interface)](#variance-interface)
    - [Wrap (type alias)](#wrap-type-alias)
  - [map](#map)
  - [mapAttempt](#mapattempt)
  - [mapOrFail](#maporfail)
  - [nested](#nested)
  - [option](#option)
  - [orElse](#orelse)
  - [orElseIf](#orelseif)
  - [repeat](#repeat)
  - [validate](#validate)
  - [withDefault](#withdefault)
  - [withDescription](#withdescription)
  - [zip](#zip)
  - [zipWith](#zipwith)

---

# constructors

## all

Constructs a config from a tuple / struct / arguments of configs.

**Signature**

```ts
export declare const all: <const Arg extends Iterable<Config<any>> | Record<string, Config<any>>>(
  arg: Arg
) => Config<
  [Arg] extends [readonly Config<any>[]]
    ? { -readonly [K in keyof Arg]: [Arg[K]] extends [Config<infer A>] ? A : never }
    : [Arg] extends [Iterable<Config<infer A>>]
    ? A[]
    : [Arg] extends [Record<string, Config<any>>]
    ? { -readonly [K in keyof Arg]: [Arg[K]] extends [Config<infer A>] ? A : never }
    : never
>
```

Added in v2.0.0

## array

Constructs a config for an array of values.

**Signature**

```ts
export declare const array: <A>(config: Config<A>, name?: string | undefined) => Config<readonly A[]>
```

Added in v2.0.0

## boolean

Constructs a config for a boolean value.

**Signature**

```ts
export declare const boolean: (name?: string | undefined) => Config<boolean>
```

Added in v2.0.0

## chunk

Constructs a config for a sequence of values.

**Signature**

```ts
export declare const chunk: <A>(config: Config<A>, name?: string | undefined) => Config<Chunk.Chunk<A>>
```

Added in v2.0.0

## date

Constructs a config for a date value.

**Signature**

```ts
export declare const date: (name?: string | undefined) => Config<Date>
```

Added in v2.0.0

## fail

Constructs a config that fails with the specified message.

**Signature**

```ts
export declare const fail: (message: string) => Config<never>
```

Added in v2.0.0

## hashMap

Constructs a config for a sequence of values.

**Signature**

```ts
export declare const hashMap: <A>(config: Config<A>, name?: string | undefined) => Config<HashMap.HashMap<string, A>>
```

Added in v2.0.0

## hashSet

Constructs a config for a sequence of values.

**Signature**

```ts
export declare const hashSet: <A>(config: Config<A>, name?: string | undefined) => Config<HashSet.HashSet<A>>
```

Added in v2.0.0

## integer

Constructs a config for a integer value.

**Signature**

```ts
export declare const integer: (name?: string | undefined) => Config<number>
```

Added in v2.0.0

## logLevel

Constructs a config for a `LogLevel` value.

**Signature**

```ts
export declare const logLevel: (name?: string | undefined) => Config<LogLevel.LogLevel>
```

Added in v2.0.0

## number

Constructs a config for a float value.

**Signature**

```ts
export declare const number: (name?: string | undefined) => Config<number>
```

Added in v2.0.0

## primitive

Constructs a new primitive config.

**Signature**

```ts
export declare const primitive: <A>(
  description: string,
  parse: (text: string) => Either<ConfigError.ConfigError, A>
) => Config<A>
```

Added in v2.0.0

## secret

Constructs a config for a secret value.

**Signature**

```ts
export declare const secret: (name?: string | undefined) => Config<ConfigSecret.ConfigSecret>
```

Added in v2.0.0

## string

Constructs a config for a string value.

**Signature**

```ts
export declare const string: (name?: string | undefined) => Config<string>
```

Added in v2.0.0

## succeed

Constructs a config which contains the specified value.

**Signature**

```ts
export declare const succeed: <A>(value: A) => Config<A>
```

Added in v2.0.0

## suspend

Lazily constructs a config.

**Signature**

```ts
export declare const suspend: <A>(config: LazyArg<Config<A>>) => Config<A>
```

Added in v2.0.0

## sync

Constructs a config which contains the specified lazy value.

**Signature**

```ts
export declare const sync: <A>(value: LazyArg<A>) => Config<A>
```

Added in v2.0.0

## unwrap

Constructs a config from some configuration wrapped with the `Wrap<A>` utility type.

For example:

```
import { Config, unwrap } from "./Config"

interface Options { key: string }

const makeConfig = (config: Config.Wrap<Options>): Config<Options> => unwrap(config)
```

**Signature**

```ts
export declare const unwrap: <A>(wrapped: Config.Wrap<A>) => Config<A>
```

Added in v2.0.0

# models

## Config (interface)

A `Config` describes the structure of some configuration data.

**Signature**

```ts
export interface Config<A> extends Config.Variance<A>, Pipeable {}
```

Added in v2.0.0

# refinements

## isConfig

This function returns `true` if the specified value is an `Config` value,
`false` otherwise.

This function can be useful for checking the type of a value before
attempting to operate on it as an `Config` value. For example, you could
use `isConfig` to check the type of a value before using it as an
argument to a function that expects an `Config` value.

**Signature**

```ts
export declare const isConfig: (u: unknown) => u is Config<unknown>
```

Added in v2.0.0

# symbols

## ConfigTypeId

**Signature**

```ts
export declare const ConfigTypeId: typeof ConfigTypeId
```

Added in v2.0.0

## ConfigTypeId (type alias)

**Signature**

```ts
export type ConfigTypeId = typeof ConfigTypeId
```

Added in v2.0.0

# utils

## Config (namespace)

Added in v2.0.0

### Primitive (interface)

**Signature**

```ts
export interface Primitive<A> extends Config<A> {
  readonly description: string
  parse(text: string): Either<ConfigError.ConfigError, A>
}
```

Added in v2.0.0

### Variance (interface)

**Signature**

```ts
export interface Variance<A> {
  readonly [ConfigTypeId]: {
    readonly _A: (_: never) => A
  }
}
```

Added in v2.0.0

### Wrap (type alias)

Wraps a nested structure, converting all primitives to a `Config`.

`Config.Wrap<{ key: string }>` becomes `{ key: Config<string> }`

To create the resulting config, use the `unwrap` constructor.

**Signature**

```ts
export type Wrap<A> =
  | (A extends Record<string, any>
      ? {
          [K in keyof A]: Wrap<A[K]>
        }
      : never)
  | Config<A>
```

Added in v2.0.0

## map

Returns a config whose structure is the same as this one, but which produces
a different value, constructed using the specified function.

**Signature**

```ts
export declare const map: {
  <A, B>(f: (a: A) => B): (self: Config<A>) => Config<B>
  <A, B>(self: Config<A>, f: (a: A) => B): Config<B>
}
```

Added in v2.0.0

## mapAttempt

Returns a config whose structure is the same as this one, but which may
produce a different value, constructed using the specified function, which
may throw exceptions that will be translated into validation errors.

**Signature**

```ts
export declare const mapAttempt: {
  <A, B>(f: (a: A) => B): (self: Config<A>) => Config<B>
  <A, B>(self: Config<A>, f: (a: A) => B): Config<B>
}
```

Added in v2.0.0

## mapOrFail

Returns a new config whose structure is the samea as this one, but which
may produce a different value, constructed using the specified fallible
function.

**Signature**

```ts
export declare const mapOrFail: {
  <A, B>(f: (a: A) => Either<ConfigError.ConfigError, B>): (self: Config<A>) => Config<B>
  <A, B>(self: Config<A>, f: (a: A) => Either<ConfigError.ConfigError, B>): Config<B>
}
```

Added in v2.0.0

## nested

Returns a config that has this configuration nested as a property of the
specified name.

**Signature**

```ts
export declare const nested: {
  (name: string): <A>(self: Config<A>) => Config<A>
  <A>(self: Config<A>, name: string): Config<A>
}
```

Added in v2.0.0

## option

Returns an optional version of this config, which will be `None` if the
data is missing from configuration, and `Some` otherwise.

**Signature**

```ts
export declare const option: <A>(self: Config<A>) => Config<Option<A>>
```

Added in v2.0.0

## orElse

Returns a config whose structure is preferentially described by this
config, but which falls back to the specified config if there is an issue
reading from this config.

**Signature**

```ts
export declare const orElse: {
  <A2>(that: LazyArg<Config<A2>>): <A>(self: Config<A>) => Config<A2 | A>
  <A, A2>(self: Config<A>, that: LazyArg<Config<A2>>): Config<A | A2>
}
```

Added in v2.0.0

## orElseIf

Returns configuration which reads from this configuration, but which falls
back to the specified configuration if reading from this configuration
fails with an error satisfying the specified predicate.

**Signature**

```ts
export declare const orElseIf: {
  <A2>(options: {
    readonly if: Predicate<ConfigError.ConfigError>
    readonly orElse: LazyArg<Config<A2>>
  }): <A>(self: Config<A>) => Config<A>
  <A, A2>(
    self: Config<A>,
    options: { readonly if: Predicate<ConfigError.ConfigError>; readonly orElse: LazyArg<Config<A2>> }
  ): Config<A>
}
```

Added in v2.0.0

## repeat

Returns a config that describes a sequence of values, each of which has the
structure of this config.

**Signature**

```ts
export declare const repeat: <A>(self: Config<A>) => Config<A[]>
```

Added in v2.0.0

## validate

Returns a config that describes the same structure as this one, but which
performs validation during loading.

**Signature**

```ts
export declare const validate: {
  <A, B extends A>(options: {
    readonly message: string
    readonly validation: Refinement<A, B>
  }): (self: Config<A>) => Config<B>
  <A>(options: { readonly message: string; readonly validation: Predicate<A> }): (self: Config<A>) => Config<A>
  <A, B extends A>(
    self: Config<A>,
    options: { readonly message: string; readonly validation: Refinement<A, B> }
  ): Config<B>
  <A>(self: Config<A>, options: { readonly message: string; readonly validation: Predicate<A> }): Config<A>
}
```

Added in v2.0.0

## withDefault

Returns a config that describes the same structure as this one, but has the
specified default value in case the information cannot be found.

**Signature**

```ts
export declare const withDefault: {
  <A2>(def: A2): <A>(self: Config<A>) => Config<A2 | A>
  <A, A2>(self: Config<A>, def: A2): Config<A | A2>
}
```

Added in v2.0.0

## withDescription

Adds a description to this configuration, which is intended for humans.

**Signature**

```ts
export declare const withDescription: {
  (description: string): <A>(self: Config<A>) => Config<A>
  <A>(self: Config<A>, description: string): Config<A>
}
```

Added in v2.0.0

## zip

Returns a config that is the composition of this config and the specified
config.

**Signature**

```ts
export declare const zip: {
  <B>(that: Config<B>): <A>(self: Config<A>) => Config<readonly [A, B]>
  <A, B>(self: Config<A>, that: Config<B>): Config<readonly [A, B]>
}
```

Added in v2.0.0

## zipWith

Returns a config that is the composes this config and the specified config
using the provided function.

**Signature**

```ts
export declare const zipWith: {
  <B, A, C>(that: Config<B>, f: (a: A, b: B) => C): (self: Config<A>) => Config<C>
  <A, B, C>(self: Config<A>, that: Config<B>, f: (a: A, b: B) => C): Config<C>
}
```

Added in v2.0.0
