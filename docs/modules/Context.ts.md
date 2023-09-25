---
title: Context.ts
nav_order: 15
parent: Modules
---

## Context overview

This module provides a data structure called `Context` that can be used for dependency injection in effectful
programs. It is essentially a table mapping `Tag`s to their implementations (called `Service`s), and can be used to
manage dependencies in a type-safe way. The `Context` data structure is essentially a way of providing access to a set
of related services that can be passed around as a single unit. This module provides functions to create, modify, and
query the contents of a `Context`, as well as a number of utility types for working with tags and services.

Added in v1.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [constructors](#constructors)
  - [Tag](#tag)
  - [empty](#empty)
  - [make](#make)
  - [unsafeMake](#unsafemake)
- [getters](#getters)
  - [get](#get)
  - [getOption](#getoption)
- [guards](#guards)
  - [isContext](#iscontext)
  - [isTag](#istag)
- [models](#models)
  - [Context (interface)](#context-interface)
  - [Tag (interface)](#tag-interface)
  - [TagUnify (interface)](#tagunify-interface)
  - [TagUnifyBlacklist (interface)](#tagunifyblacklist-interface)
  - [ValidTagsById (type alias)](#validtagsbyid-type-alias)
- [symbol](#symbol)
  - [TagTypeId (type alias)](#tagtypeid-type-alias)
  - [TypeId (type alias)](#typeid-type-alias)
- [unsafe](#unsafe)
  - [unsafeGet](#unsafeget)
- [utils](#utils)
  - [Tag (namespace)](#tag-namespace)
    - [Identifier (type alias)](#identifier-type-alias)
    - [Service (type alias)](#service-type-alias)
  - [add](#add)
  - [merge](#merge)
  - [omit](#omit)
  - [pick](#pick)

---

# constructors

## Tag

Creates a new `Tag` instance with an optional key parameter.

Specifying the `key` will make the `Tag` global, meaning two tags with the same
key will map to the same instance.

Note: this is useful for cases where live reload can happen and it is
desireable to preserve the instance across reloads.

**Signature**

```ts
export declare const Tag: <Identifier, Service = Identifier>(identifier?: unknown) => Tag<Identifier, Service>
```

**Example**

```ts
import * as Context from 'effect/Context'

assert.strictEqual(Context.Tag() === Context.Tag(), false)
assert.strictEqual(Context.Tag('PORT') === Context.Tag('PORT'), true)
```

Added in v1.0.0

## empty

Returns an empty `Context`.

**Signature**

```ts
export declare const empty: () => Context<never>
```

**Example**

```ts
import * as Context from 'effect/Context'

assert.strictEqual(Context.isContext(Context.empty()), true)
```

Added in v1.0.0

## make

Creates a new `Context` with a single service associated to the tag.

**Signature**

```ts
export declare const make: <T extends Tag<any, any>>(tag: T, service: Tag.Service<T>) => Context<Tag.Identifier<T>>
```

**Example**

```ts
import * as Context from 'effect/Context'

const Port = Context.Tag<{ PORT: number }>()

const Services = Context.make(Port, { PORT: 8080 })

assert.deepStrictEqual(Context.get(Services, Port), { PORT: 8080 })
```

Added in v1.0.0

## unsafeMake

**Signature**

```ts
export declare const unsafeMake: <Services>(unsafeMap: Map<Tag<any, any>, any>) => Context<Services>
```

Added in v1.0.0

# getters

## get

Get a service from the context that corresponds to the given tag.

**Signature**

```ts
export declare const get: {
  <Services, T extends ValidTagsById<Services>>(tag: T): (self: Context<Services>) => Tag.Service<T>
  <Services, T extends ValidTagsById<Services>>(self: Context<Services>, tag: T): Tag.Service<T>
}
```

**Example**

```ts
import * as Context from 'effect/Context'
import { pipe } from 'effect/Function'

const Port = Context.Tag<{ PORT: number }>()
const Timeout = Context.Tag<{ TIMEOUT: number }>()

const Services = pipe(Context.make(Port, { PORT: 8080 }), Context.add(Timeout, { TIMEOUT: 5000 }))

assert.deepStrictEqual(Context.get(Services, Timeout), { TIMEOUT: 5000 })
```

Added in v1.0.0

## getOption

Get the value associated with the specified tag from the context wrapped in an `Option` object. If the tag is not
found, the `Option` object will be `None`.

**Signature**

```ts
export declare const getOption: {
  <S, I>(tag: Tag<I, S>): <Services>(self: Context<Services>) => Option<S>
  <Services, S, I>(self: Context<Services>, tag: Tag<I, S>): Option<S>
}
```

**Example**

```ts
import * as Context from 'effect/Context'
import * as O from 'effect/Option'

const Port = Context.Tag<{ PORT: number }>()
const Timeout = Context.Tag<{ TIMEOUT: number }>()

const Services = Context.make(Port, { PORT: 8080 })

assert.deepStrictEqual(Context.getOption(Services, Port), O.some({ PORT: 8080 }))
assert.deepStrictEqual(Context.getOption(Services, Timeout), O.none())
```

Added in v1.0.0

# guards

## isContext

Checks if the provided argument is a `Context`.

**Signature**

```ts
export declare const isContext: (input: unknown) => input is Context<never>
```

**Example**

```ts
import * as Context from 'effect/Context'

assert.strictEqual(Context.isContext(Context.empty()), true)
```

Added in v1.0.0

## isTag

Checks if the provided argument is a `Tag`.

**Signature**

```ts
export declare const isTag: (input: unknown) => input is Tag<any, any>
```

**Example**

```ts
import * as Context from 'effect/Context'

assert.strictEqual(Context.isTag(Context.Tag()), true)
```

Added in v1.0.0

# models

## Context (interface)

**Signature**

```ts
export interface Context<Services> extends Equal, Pipeable, Inspectable {
  readonly [TypeId]: {
    readonly _S: (_: Services) => unknown
  }
  readonly unsafeMap: Map<Tag<any, any>, any>
}
```

Added in v1.0.0

## Tag (interface)

**Signature**

```ts
export interface Tag<Identifier, Service> extends Pipeable, Inspectable {
  readonly _tag: 'Tag'
  readonly [TagTypeId]: {
    readonly _S: (_: Service) => Service
    readonly _I: (_: Identifier) => Identifier
  }
  of(self: Service): Service
  context(self: Service): Context<Identifier>
  readonly stack?: string | undefined
  readonly identifier?: unknown | undefined
  [Unify.typeSymbol]?: unknown
  [Unify.unifySymbol]?: TagUnify<this>
  [Unify.blacklistSymbol]?: TagUnifyBlacklist
}
```

Added in v1.0.0

## TagUnify (interface)

**Signature**

```ts
export interface TagUnify<A extends { [Unify.typeSymbol]?: any }> {
  Tag?: () => A[Unify.typeSymbol] extends Tag<infer I0, infer S0> | infer _ ? Tag<I0, S0> : never
}
```

Added in v1.0.0

## TagUnifyBlacklist (interface)

**Signature**

```ts
export interface TagUnifyBlacklist {}
```

Added in v1.0.0

## ValidTagsById (type alias)

**Signature**

```ts
export type ValidTagsById<R> = R extends infer S ? Tag<S, any> : never
```

Added in v1.0.0

# symbol

## TagTypeId (type alias)

**Signature**

```ts
export type TagTypeId = typeof TagTypeId
```

Added in v1.0.0

## TypeId (type alias)

**Signature**

```ts
export type TypeId = typeof TypeId
```

Added in v1.0.0

# unsafe

## unsafeGet

Get a service from the context that corresponds to the given tag.
This function is unsafe because if the tag is not present in the context, a runtime error will be thrown.

For a safer version see {@link getOption}.

**Signature**

```ts
export declare const unsafeGet: {
  <S, I>(tag: Tag<I, S>): <Services>(self: Context<Services>) => S
  <Services, S, I>(self: Context<Services>, tag: Tag<I, S>): S
}
```

**Example**

```ts
import * as Context from 'effect/Context'

const Port = Context.Tag<{ PORT: number }>()
const Timeout = Context.Tag<{ TIMEOUT: number }>()

const Services = Context.make(Port, { PORT: 8080 })

assert.deepStrictEqual(Context.unsafeGet(Services, Port), { PORT: 8080 })
assert.throws(() => Context.unsafeGet(Services, Timeout))
```

Added in v1.0.0

# utils

## Tag (namespace)

Added in v1.0.0

### Identifier (type alias)

**Signature**

```ts
export type Identifier<T extends Tag<any, any>> = T extends Tag<infer A, any> ? A : never
```

Added in v1.0.0

### Service (type alias)

**Signature**

```ts
export type Service<T extends Tag<any, any>> = T extends Tag<any, infer A> ? A : never
```

Added in v1.0.0

## add

Adds a service to a given `Context`.

**Signature**

```ts
export declare const add: {
  <T extends Tag<any, any>>(tag: T, service: Tag.Service<T>): <Services>(
    self: Context<Services>
  ) => Context<Services | Tag.Identifier<T>>
  <Services, T extends Tag<any, any>>(self: Context<Services>, tag: T, service: Tag.Service<T>): Context<
    Services | Tag.Identifier<T>
  >
}
```

**Example**

```ts
import * as Context from 'effect/Context'
import { pipe } from 'effect/Function'

const Port = Context.Tag<{ PORT: number }>()
const Timeout = Context.Tag<{ TIMEOUT: number }>()

const someContext = Context.make(Port, { PORT: 8080 })

const Services = pipe(someContext, Context.add(Timeout, { TIMEOUT: 5000 }))

assert.deepStrictEqual(Context.get(Services, Port), { PORT: 8080 })
assert.deepStrictEqual(Context.get(Services, Timeout), { TIMEOUT: 5000 })
```

Added in v1.0.0

## merge

Merges two `Context`s, returning a new `Context` containing the services of both.

**Signature**

```ts
export declare const merge: {
  <R1>(that: Context<R1>): <Services>(self: Context<Services>) => Context<R1 | Services>
  <Services, R1>(self: Context<Services>, that: Context<R1>): Context<Services | R1>
}
```

**Example**

```ts
import * as Context from 'effect/Context'

const Port = Context.Tag<{ PORT: number }>()
const Timeout = Context.Tag<{ TIMEOUT: number }>()

const firstContext = Context.make(Port, { PORT: 8080 })
const secondContext = Context.make(Timeout, { TIMEOUT: 5000 })

const Services = Context.merge(firstContext, secondContext)

assert.deepStrictEqual(Context.get(Services, Port), { PORT: 8080 })
assert.deepStrictEqual(Context.get(Services, Timeout), { TIMEOUT: 5000 })
```

Added in v1.0.0

## omit

**Signature**

```ts
export declare const omit: <Services, S extends ValidTagsById<Services>[]>(
  ...tags: S
) => (self: Context<Services>) => Context<Exclude<Services, { [k in keyof S]: Tag.Identifier<S[k]> }[keyof S]>>
```

Added in v1.0.0

## pick

Returns a new `Context` that contains only the specified services.

**Signature**

```ts
export declare const pick: <Services, S extends ValidTagsById<Services>[]>(
  ...tags: S
) => (self: Context<Services>) => Context<{ [k in keyof S]: Tag.Identifier<S[k]> }[number]>
```

**Example**

```ts
import * as Context from 'effect/Context'
import { pipe } from 'effect/Function'
import * as O from 'effect/Option'

const Port = Context.Tag<{ PORT: number }>()
const Timeout = Context.Tag<{ TIMEOUT: number }>()

const someContext = pipe(Context.make(Port, { PORT: 8080 }), Context.add(Timeout, { TIMEOUT: 5000 }))

const Services = pipe(someContext, Context.pick(Port))

assert.deepStrictEqual(Context.getOption(Services, Port), O.some({ PORT: 8080 }))
assert.deepStrictEqual(Context.getOption(Services, Timeout), O.none())
```

Added in v1.0.0
