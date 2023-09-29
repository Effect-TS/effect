/**
 * @since 1.0.0
 */
import * as internal from "@effect/rpc/internal/schema"
import type { Json } from "@effect/rpc/internal/schema"
import type { RpcRequest } from "@effect/rpc/Resolver"
import * as Schema from "@effect/schema/Schema"
import type { Context } from "effect/Context"

/**
 * @since 1.0.0
 */
export namespace RpcSchema {
  /**
   * @category models
   * @since 1.0.0
   */
  export interface IO<IE, E, II, I, IO, O> {
    input: Schema.Schema<II, I>
    output: Schema.Schema<IO, O>
    error: Schema.Schema<IE, E>
  }

  /**
   * @category models
   * @since 1.0.0
   */
  export interface NoError<II, I, IO, O> {
    input: Schema.Schema<II, I>
    output: Schema.Schema<IO, O>
  }

  /**
   * @category models
   * @since 1.0.0
   */
  export interface NoInput<IE, E, IO, O> {
    output: Schema.Schema<IO, O>
    error: Schema.Schema<IE, E>
  }

  /**
   * @category models
   * @since 1.0.0
   */
  export interface NoInputNoError<IO, O> {
    output: Schema.Schema<IO, O>
  }

  /**
   * @category models
   * @since 1.0.0
   */
  export type Any =
    | IO<any, any, any, any, any, any>
    | NoError<any, any, any, any>
    | NoInput<any, any, any, any>
    | NoInputNoError<any, any>

  /**
   * @category models
   * @since 1.0.0
   */
  export interface Base {
    readonly input?: Schema.Schema<any>
    readonly output: Schema.Schema<any>
    readonly error: Schema.Schema<any>
  }

  /**
   * @category utils
   * @since 1.0.0
   */
  export type Input<S extends RpcSchema.Any> = S extends {
    readonly input: Schema.Schema<infer _I, infer A>
  } ? A
    : never

  /**
   * @category utils
   * @since 1.0.0
   */
  export type Error<S extends RpcSchema.Any> = S extends {
    readonly error: Schema.Schema<infer _I, infer A>
  } ? A
    : never

  /**
   * @category utils
   * @since 1.0.0
   */
  export type Output<S extends RpcSchema.Any> = S extends {
    readonly output: Schema.Schema<infer _I, infer A>
  } ? A
    : never
}

/**
 * @since 1.0.0
 */
export const RpcServiceId: unique symbol = internal.RpcServiceId

/**
 * @since 1.0.0
 */
export type RpcServiceId = typeof RpcServiceId

/**
 * @since 1.0.0
 */
export const RpcServiceErrorId: unique symbol = internal.RpcServiceErrorId

/**
 * @since 1.0.0
 */
export type RpcServiceErrorId = typeof RpcServiceErrorId

/**
 * @since 1.0.0
 */
export namespace RpcService {
  /**
   * @category models
   * @since 1.0.0
   */
  export interface Definition extends Record<string, RpcSchema.Any | WithId<any, any, any>> {
    __setup?:
      | RpcSchema.IO<any, any, any, any, Context<any>, Context<any>>
      | RpcSchema.NoError<any, any, Context<any>, Context<any>>
  }

  /**
   * @category models
   * @since 1.0.0
   */
  export interface DefinitionWithId extends Definition {
    readonly [RpcServiceId]: RpcServiceId
    readonly [RpcServiceErrorId]:
      | Schema.Schema<any, any>
      | Schema.Schema<never, never>
  }

  /**
   * @category models
   * @since 1.0.0
   */
  export interface DefinitionWithoutSetup extends DefinitionWithId {
    readonly __setup?: never
  }

  /**
   * @category models
   * @since 1.0.0
   */
  export interface DefinitionWithSetup extends DefinitionWithId {
    readonly __setup: Definition["__setup"] & {}
  }

  /**
   * @category models
   * @since 1.0.0
   */
  export type WithId<S extends RpcService.Definition, EI, E> = S & {
    readonly [RpcServiceId]: RpcServiceId
    readonly [RpcServiceErrorId]: Schema.Schema<EI, E>
  }

  /**
   * @category utils
   * @since 1.0.0
   */
  export type Errors<S extends DefinitionWithId> = Schema.Schema.To<
    S[RpcServiceErrorId]
  >

  /**
   * @category utils
   * @since 1.0.0
   */
  export type ErrorsFrom<S extends DefinitionWithId> = Schema.Schema.From<
    S[RpcServiceErrorId]
  >

  /**
   * @category utils
   * @since 1.0.0
   */
  export type SetupInput<S extends DefinitionWithSetup> = RpcSchema.Input<
    S["__setup"]
  >

  /**
   * @category utils
   * @since 1.0.0
   */
  export type SetupError<S extends DefinitionWithSetup> = RpcSchema.Error<
    S["__setup"]
  >

  /**
   * @category utils
   * @since 1.0.0
   */
  export type SetupOutput<S extends DefinitionWithSetup> = RpcSchema.Output<
    S["__setup"]
  >

  /**
   * @category utils
   * @since 1.0.0
   */
  export type Methods<S extends DefinitionWithId, P extends string = ``> = {
    [M in keyof S]: M extends string ? S[M] extends DefinitionWithId ? Methods<S[M], `${P}${M}.`>
      : `${P}${M}`
      : never
  }[keyof S]

  /**
   * @category utils
   * @since 1.0.0
   */
  export type Validate<
    VL extends string,
    V,
    S extends RpcService.Definition
  > = {
    readonly [K in keyof S]: K extends "__setup" ? S[K]
      : S[K] extends DefinitionWithId ? Validate<VL, V, S[K]>
      : S[K] extends RpcSchema.IO<
        infer IE,
        infer _E,
        infer II,
        infer _I,
        infer IO,
        infer _O
      > ? [IE | II | IO] extends [V] ? S[K]
        : `schema input does not extend ${VL}`
      : S[K] extends RpcSchema.NoError<infer II, infer _I, infer IO, infer _O> ? [II | IO] extends [V] ? S[K]
        : `schema input does not extend ${VL}`
      : S[K] extends RpcSchema.NoInput<infer IE, infer _E, infer IO, infer _O> ? [IE | IO] extends [V] ? S[K]
        : `schema input does not extend ${VL}`
      : S[K] extends RpcSchema.NoInputNoError<infer IO, infer _O> ? [IO] extends [V] ? S[K]
        : `schema input does not extend ${VL}`
      : S[K]
  }

  /**
   * @category utils
   * @since 1.0.0
   */
  export type Simplify<
    T extends RpcService.Definition,
    EI,
    E
  > = T extends infer S ? RpcService.WithId<
      { readonly [K in Exclude<keyof S, RpcServiceId>]: S[K] },
      EI,
      E
    >
    : never
}

/**
 * @category constructors
 * @since 1.0.0
 */
export const makeWith = <VL extends string, V>() =>
<S extends RpcService.Definition>(
  schema: S
): RpcService.Simplify<RpcService.Validate<VL, V, S>, never, never> => ({
  ...(schema as any),
  [RpcServiceId]: RpcServiceId,
  [RpcServiceErrorId]: Schema.never
})

/**
 * Make a RPC service schema that can be encoded and decoded from JSON.
 *
 * @category constructors
 * @since 1.0.0
 */
export const make = makeWith<"Schema.Json", Json>()

/**
 * Add a service level error, which can then be used with `Router.provideServiceEffect`.
 *
 * @category combinators
 * @since 1.0.0
 */
export const withServiceError: {
  <EI extends Json, E>(
    error: Schema.Schema<EI, E>
  ): <S extends RpcService.DefinitionWithId>(
    self: S
  ) => RpcService.WithId<
    S,
    EI | RpcService.ErrorsFrom<S>,
    E | RpcService.Errors<S>
  >
  <S extends RpcService.DefinitionWithId, EI extends Json, E>(
    self: S,
    error: Schema.Schema<EI, E>
  ): RpcService.WithId<
    S,
    EI | RpcService.ErrorsFrom<S>,
    E | RpcService.Errors<S>
  >
} = internal.withServiceError

/**
 * @since 1.0.0
 */
export namespace RpcRequestSchema {
  /**
   * @category utils
   * @since 1.0.0
   */
  export type From<S extends RpcService.Definition, P extends string = ""> = {
    readonly [K in keyof S]: K extends string ? S[K] extends RpcService.DefinitionWithId ? To<S[K], `${P}${K}.`>
      : S[K] extends RpcSchema.IO<
        infer _IE,
        infer _E,
        infer II,
        infer _I,
        infer _IO,
        infer _O
      > ? { readonly _tag: `${P}${K}`; readonly input: II }
      : S[K] extends RpcSchema.NoError<
        infer II,
        infer _I,
        infer _IO,
        infer _O
      > ? { readonly _tag: `${P}${K}`; readonly input: II }
      : S[K] extends RpcSchema.NoInput<
        infer _IE,
        infer _E,
        infer _IO,
        infer _O
      > ? { readonly _tag: `${P}${K}` }
      : S[K] extends RpcSchema.NoInputNoError<infer _IO, infer _O> ? { readonly _tag: `${P}${K}` }
      : never
      : never
  }[keyof S]

  /**
   * @category utils
   * @since 1.0.0
   */
  export type To<S extends RpcService.Definition, P extends string = ""> = {
    readonly [K in keyof S]: K extends string ? S[K] extends RpcService.DefinitionWithId ? To<S[K], `${P}${K}.`>
      : S[K] extends RpcSchema.IO<
        infer _IE,
        infer _E,
        infer _II,
        infer I,
        infer _IO,
        infer _O
      > ? RpcRequest.WithInput<`${P}${K}`, I>
      : S[K] extends RpcSchema.NoError<
        infer _II,
        infer I,
        infer _IO,
        infer _O
      > ? RpcRequest.WithInput<`${P}${K}`, I>
      : S[K] extends RpcSchema.NoInput<
        infer _IE,
        infer _E,
        infer _IO,
        infer _O
      > ? RpcRequest.NoInput<`${P}${K}`>
      : S[K] extends RpcSchema.NoInputNoError<infer _IO, infer _O> ? RpcRequest.NoInput<`${P}${K}`>
      : never
      : never
  }[keyof S]

  /**
   * @category models
   * @since 1.0.0
   */
  export type Schema<S extends RpcService.Definition> =
    & Schema.Schema<
      From<S>,
      To<S>
    >
    & {}
}

/**
 * @category constructors
 * @since 1.0.0
 */
export const context = <R>(): Schema.Schema<Context<R>> => Schema.any

/**
 * @category constructors
 * @since 1.0.0
 */
export const makeRequestUnion = <S extends RpcService.Definition>(
  schema: S
): RpcRequestSchema.Schema<S> =>
  Schema.union(
    ...Object.entries(schema).map(
      ([tag, schema]): Schema.Schema<any, any> =>
        "input" in schema
          ? Schema.struct({
            _tag: Schema.literal(tag),
            input: schema.input as Schema.Schema<any, any>
          })
          : Schema.struct({ _tag: Schema.literal(tag) })
    )
  )
