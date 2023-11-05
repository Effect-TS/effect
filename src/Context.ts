/**
 * This module provides a data structure called `Context` that can be used for dependency injection in effectful
 * programs. It is essentially a table mapping `Tag`s to their implementations (called `Service`s), and can be used to
 * manage dependencies in a type-safe way. The `Context` data structure is essentially a way of providing access to a set
 * of related services that can be passed around as a single unit. This module provides functions to create, modify, and
 * query the contents of a `Context`, as well as a number of utility types for working with tags and services.
 *
 * @since 2.0.0
 */
import type { Equal } from "./Equal.js"
import type { Inspectable } from "./Inspectable.js"
import * as internal from "./internal/context.js"
import type { Option } from "./Option.js"
import type { Pipeable } from "./Pipeable.js"
import type * as Unify from "./Unify.js"

const TagTypeId: unique symbol = internal.TagTypeId

/**
 * @since 2.0.0
 * @category symbol
 */
export type TagTypeId = typeof TagTypeId

/**
 * @since 2.0.0
 * @category models
 */
export interface Tag<Identifier, Service> extends Pipeable, Inspectable {
  readonly _tag: "Tag"
  readonly _op: "Tag"
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

/**
 * @category models
 * @since 2.0.0
 */
export interface TagUnify<A extends { [Unify.typeSymbol]?: any }> {
  Tag?: () => A[Unify.typeSymbol] extends Tag<infer I0, infer S0> | infer _ ? Tag<I0, S0> : never
}

/**
 * @category models
 * @since 2.0.0
 */
export interface TagUnifyBlacklist {}

/**
 * @since 2.0.0
 */
export declare namespace Tag {
  /**
   * @since 2.0.0
   */
  export type Service<T extends Tag<any, any>> = T extends Tag<any, infer A> ? A : never
  /**
   * @since 2.0.0
   */
  export type Identifier<T extends Tag<any, any>> = T extends Tag<infer A, any> ? A : never
}

/**
 * Creates a new `Tag` instance with an optional key parameter.
 *
 * Specifying the `key` will make the `Tag` global, meaning two tags with the same
 * key will map to the same instance.
 *
 * Note: this is useful for cases where live reload can happen and it is
 * desireable to preserve the instance across reloads.
 *
 * @param key - An optional key that makes the `Tag` global.
 *
 * @example
 * import * as Context from "effect/Context"
 *
 * assert.strictEqual(Context.Tag() === Context.Tag(), false)
 * assert.strictEqual(Context.Tag("PORT") === Context.Tag("PORT"), true)
 *
 * @since 2.0.0
 * @category constructors
 */
export const Tag: <Identifier, Service = Identifier>(identifier?: unknown) => Tag<Identifier, Service> =
  internal.makeTag

const TypeId: unique symbol = internal.TypeId as TypeId

/**
 * @since 2.0.0
 * @category symbol
 */
export type TypeId = typeof TypeId

/**
 * @since 2.0.0
 * @category models
 */
export type ValidTagsById<R> = R extends infer S ? Tag<S, any> : never

/**
 * @since 2.0.0
 * @category models
 */
export interface Context<Services> extends Equal, Pipeable, Inspectable {
  readonly [TypeId]: {
    readonly _S: (_: Services) => unknown
  }
  readonly unsafeMap: Map<Tag<any, any>, any>
}

/**
 * @since 2.0.0
 * @category constructors
 */
export const unsafeMake: <Services>(unsafeMap: Map<Tag<any, any>, any>) => Context<Services> = internal.makeContext

/**
 * Checks if the provided argument is a `Context`.
 *
 * @param input - The value to be checked if it is a `Context`.
 *
 * @example
 * import * as Context from "effect/Context"
 *
 * assert.strictEqual(Context.isContext(Context.empty()), true)
 *
 * @since 2.0.0
 * @category guards
 */
export const isContext: (input: unknown) => input is Context<never> = internal.isContext

/**
 * Checks if the provided argument is a `Tag`.
 *
 * @param input - The value to be checked if it is a `Tag`.
 *
 * @example
 * import * as Context from "effect/Context"
 *
 * assert.strictEqual(Context.isTag(Context.Tag()), true)
 *
 * @since 2.0.0
 * @category guards
 */
export const isTag: (input: unknown) => input is Tag<any, any> = internal.isTag

/**
 * Returns an empty `Context`.
 *
 * @example
 * import * as Context from "effect/Context"
 *
 * assert.strictEqual(Context.isContext(Context.empty()), true)
 *
 * @since 2.0.0
 * @category constructors
 */
export const empty: () => Context<never> = internal.empty

/**
 * Creates a new `Context` with a single service associated to the tag.
 *
 * @example
 * import * as Context from "effect/Context"
 *
 * const Port = Context.Tag<{ PORT: number }>()
 *
 * const Services = Context.make(Port, { PORT: 8080 })
 *
 * assert.deepStrictEqual(Context.get(Services, Port), { PORT: 8080 })
 *
 * @since 2.0.0
 * @category constructors
 */
export const make: <T extends Tag<any, any>>(tag: T, service: Tag.Service<T>) => Context<Tag.Identifier<T>> =
  internal.make

/**
 * Adds a service to a given `Context`.
 *
 * @example
 * import * as Context from "effect/Context"
 * import { pipe } from "effect/Function"
 *
 * const Port = Context.Tag<{ PORT: number }>()
 * const Timeout = Context.Tag<{ TIMEOUT: number }>()
 *
 * const someContext = Context.make(Port, { PORT: 8080 })
 *
 * const Services = pipe(
 *   someContext,
 *   Context.add(Timeout, { TIMEOUT: 5000 })
 * )
 *
 * assert.deepStrictEqual(Context.get(Services, Port), { PORT: 8080 })
 * assert.deepStrictEqual(Context.get(Services, Timeout), { TIMEOUT: 5000 })
 *
 * @since 2.0.0
 */
export const add: {
  <T extends Tag<any, any>>(
    tag: T,
    service: Tag.Service<T>
  ): <Services>(self: Context<Services>) => Context<Services | Tag.Identifier<T>>
  <Services, T extends Tag<any, any>>(
    self: Context<Services>,
    tag: T,
    service: Tag.Service<T>
  ): Context<Services | Tag.Identifier<T>>
} = internal.add

/**
 * Get a service from the context that corresponds to the given tag.
 *
 * @param self - The `Context` to search for the service.
 * @param tag - The `Tag` of the service to retrieve.
 *
 * @example
 * import * as Context from "effect/Context"
 * import { pipe } from "effect/Function"
 *
 * const Port = Context.Tag<{ PORT: number }>()
 * const Timeout = Context.Tag<{ TIMEOUT: number }>()
 *
 * const Services = pipe(
 *   Context.make(Port, { PORT: 8080 }),
 *   Context.add(Timeout, { TIMEOUT: 5000 })
 * )
 *
 * assert.deepStrictEqual(Context.get(Services, Timeout), { TIMEOUT: 5000 })
 *
 * @since 2.0.0
 * @category getters
 */
export const get: {
  <Services, T extends ValidTagsById<Services>>(tag: T): (self: Context<Services>) => Tag.Service<T>
  <Services, T extends ValidTagsById<Services>>(self: Context<Services>, tag: T): Tag.Service<T>
} = internal.get

/**
 * Get a service from the context that corresponds to the given tag.
 * This function is unsafe because if the tag is not present in the context, a runtime error will be thrown.
 *
 * For a safer version see {@link getOption}.
 *
 * @param self - The `Context` to search for the service.
 * @param tag - The `Tag` of the service to retrieve.
 *
 * @example
 * import * as Context from "effect/Context"
 *
 * const Port = Context.Tag<{ PORT: number }>()
 * const Timeout = Context.Tag<{ TIMEOUT: number }>()
 *
 * const Services = Context.make(Port, { PORT: 8080 })
 *
 * assert.deepStrictEqual(Context.unsafeGet(Services, Port), { PORT: 8080 })
 * assert.throws(() => Context.unsafeGet(Services, Timeout))
 *
 * @since 2.0.0
 * @category unsafe
 */
export const unsafeGet: {
  <S, I>(tag: Tag<I, S>): <Services>(self: Context<Services>) => S
  <Services, S, I>(self: Context<Services>, tag: Tag<I, S>): S
} = internal.unsafeGet

/**
 * Get the value associated with the specified tag from the context wrapped in an `Option` object. If the tag is not
 * found, the `Option` object will be `None`.
 *
 * @param self - The `Context` to search for the service.
 * @param tag - The `Tag` of the service to retrieve.
 *
 * @example
 * import * as Context from "effect/Context"
 * import * as O from "effect/Option"
 *
 * const Port = Context.Tag<{ PORT: number }>()
 * const Timeout = Context.Tag<{ TIMEOUT: number }>()
 *
 * const Services = Context.make(Port, { PORT: 8080 })
 *
 * assert.deepStrictEqual(Context.getOption(Services, Port), O.some({ PORT: 8080 }))
 * assert.deepStrictEqual(Context.getOption(Services, Timeout), O.none())
 *
 * @since 2.0.0
 * @category getters
 */
export const getOption: {
  <S, I>(tag: Tag<I, S>): <Services>(self: Context<Services>) => Option<S>
  <Services, S, I>(self: Context<Services>, tag: Tag<I, S>): Option<S>
} = internal.getOption

/**
 * Merges two `Context`s, returning a new `Context` containing the services of both.
 *
 * @param self - The first `Context` to merge.
 * @param that - The second `Context` to merge.
 *
 * @example
 * import * as Context from "effect/Context"
 *
 * const Port = Context.Tag<{ PORT: number }>()
 * const Timeout = Context.Tag<{ TIMEOUT: number }>()
 *
 * const firstContext = Context.make(Port, { PORT: 8080 })
 * const secondContext = Context.make(Timeout, { TIMEOUT: 5000 })
 *
 * const Services = Context.merge(firstContext, secondContext)
 *
 * assert.deepStrictEqual(Context.get(Services, Port), { PORT: 8080 })
 * assert.deepStrictEqual(Context.get(Services, Timeout), { TIMEOUT: 5000 })
 *
 * @since 2.0.0
 */
export const merge: {
  <R1>(that: Context<R1>): <Services>(self: Context<Services>) => Context<R1 | Services>
  <Services, R1>(self: Context<Services>, that: Context<R1>): Context<Services | R1>
} = internal.merge

/**
 * Returns a new `Context` that contains only the specified services.
 *
 * @param self - The `Context` to prune services from.
 * @param tags - The list of `Tag`s to be included in the new `Context`.
 *
 * @example
 * import * as Context from "effect/Context"
 * import { pipe } from "effect/Function"
 * import * as O from "effect/Option"
 *
 * const Port = Context.Tag<{ PORT: number }>()
 * const Timeout = Context.Tag<{ TIMEOUT: number }>()
 *
 * const someContext = pipe(
 *   Context.make(Port, { PORT: 8080 }),
 *   Context.add(Timeout, { TIMEOUT: 5000 })
 * )
 *
 * const Services = pipe(someContext, Context.pick(Port))
 *
 * assert.deepStrictEqual(Context.getOption(Services, Port), O.some({ PORT: 8080 }))
 * assert.deepStrictEqual(Context.getOption(Services, Timeout), O.none())
 *
 * @since 2.0.0
 */
export const pick: <Services, S extends Array<ValidTagsById<Services>>>(
  ...tags: S
) => (self: Context<Services>) => Context<{ [k in keyof S]: Tag.Identifier<S[k]> }[number]> = internal.pick

/**
 * @since 2.0.0
 */
export const omit: <Services, S extends Array<ValidTagsById<Services>>>(
  ...tags: S
) => (self: Context<Services>) => Context<Exclude<Services, { [k in keyof S]: Tag.Identifier<S[k]> }[keyof S]>> =
  internal.omit
