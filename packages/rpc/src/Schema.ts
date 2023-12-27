/**
 * @since 1.0.0
 */
import * as Schema from "@effect/schema/Schema"
import * as internal from "./internal/schema.js"
import type { Json } from "./internal/schema.js"
import type { RpcRequest } from "./Resolver.js"

/**
 * @since 1.0.0
 */
export namespace RpcSchema {
  /**
   * @category models
   * @since 1.0.0
   */
  export interface IO<IE, E, II, I, IO, O> {
    readonly input: Schema.Schema<II, I>
    readonly output: Schema.Schema<IO, O>
    readonly error: Schema.Schema<IE, E>
  }

  /**
   * @category models
   * @since 1.0.0
   */
  export interface NoError<II, I, IO, O> {
    readonly input: Schema.Schema<II, I>
    readonly output: Schema.Schema<IO, O>
  }

  /**
   * @category models
   * @since 1.0.0
   */
  export interface NoInput<IE, E, IO, O> {
    readonly output: Schema.Schema<IO, O>
    readonly error: Schema.Schema<IE, E>
  }

  /**
   * @category models
   * @since 1.0.0
   */
  export interface NoInputNoError<IO, O> {
    readonly output: Schema.Schema<IO, O>
  }

  /**
   * @category models
   * @since 1.0.0
   */
  export interface NoOutput<IE, E, II, I> {
    readonly input: Schema.Schema<II, I>
    readonly error: Schema.Schema<IE, E>
  }

  /**
   * @category models
   * @since 1.0.0
   */
  export interface NoErrorNoOutput<II, I> {
    readonly input: Schema.Schema<II, I>
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
    | NoOutput<any, any, any, any>
    | NoErrorNoOutput<any, any>

  /**
   * @category models
   * @since 1.0.0
   */
  export interface Base {
    readonly input?: Schema.Schema<any>
    readonly output?: Schema.Schema<any>
    readonly error: Schema.Schema<any>
  }

  /**
   * @category utils
   * @since 1.0.0
   */
  export type Input<S> = S extends {
    readonly input: Schema.Schema<infer _I, infer A>
  } ? A
    : never

  /**
   * @category utils
   * @since 1.0.0
   */
  export type Error<S> = S extends {
    readonly error: Schema.Schema<infer _I, infer A>
  } ? A
    : never

  /**
   * @category utils
   * @since 1.0.0
   */
  export type Output<S> = S extends {
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
  export interface Definition {
    readonly [method: string]: RpcSchema.Any | DefinitionWithId
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
  export interface DefinitionWithSetup extends DefinitionWithId {
    readonly __setup: Definition["__setup"] & {}
  }

  /**
   * @category models
   * @since 1.0.0
   */
  export type WithId<S, EI, E> = S & {
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
  export type Methods<
    S extends DefinitionWithId,
    P extends string = ``,
    Depth extends ReadonlyArray<number> = []
  > = Extract<keyof S, string> extends infer M
    ? M extends Extract<keyof S, string> ?
      S[M] extends DefinitionWithId ? Depth["length"] extends 3 ? never : Methods<S[M], `${P}${M}.`, [0, ...Depth]>
      : `${P}${M}`
    : never
    : never

  /**
   * @category utils
   * @since 1.0.0
   */
  export type Validate<
    VL extends string,
    V,
    S extends RpcService.Definition,
    Depth extends ReadonlyArray<number> = []
  > = {
    readonly [K in keyof S]: K extends "__setup" ? S[K]
      : S[K] extends DefinitionWithId ? Depth["length"] extends 3 ? never : Validate<VL, V, S[K], [0, ...Depth]>
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
    T,
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
<const S extends RpcService.Definition>(
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
  export type From<
    S extends RpcService.Definition,
    P extends string = "",
    Depth extends ReadonlyArray<number> = []
  > = Extract<keyof S, string> extends infer K
    ? K extends Extract<keyof S, string> ?
      S[K] extends RpcService.DefinitionWithId ?
        Depth["length"] extends 3 ? never : From<S[K], `${P}${K}.`, [0, ...Depth]>
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
    : never

  /**
   * @category utils
   * @since 1.0.0
   */
  export type To<
    S extends RpcService.Definition,
    P extends string = "",
    Depth extends ReadonlyArray<number> = []
  > = Extract<keyof S, string> extends infer K
    ? K extends Extract<keyof S, string> ?
      S[K] extends RpcService.DefinitionWithId ?
        Depth["length"] extends 3 ? never : To<S[K], `${P}${K}.`, [0, ...Depth]>
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
    : never

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

/**
 * @category type ids
 * @since 1.0.0
 */
export const HashAnnotationId: unique symbol = internal.HashAnnotationId

/**
 * @category type ids
 * @since 1.0.0
 */
export type HashAnnotationId = typeof HashAnnotationId

/**
 * @category annotations
 * @since 1.0.0
 */
export const withHash: {
  <A>(f: (a: A) => number): <I>(self: Schema.Schema<I, A>) => Schema.Schema<I, A>
  <I, A>(self: Schema.Schema<I, A>, f: (a: A) => number): Schema.Schema<I, A>
} = internal.withHash

/**
 * @category annotations
 * @since 1.0.0
 */
export const withHashString: {
  <A>(f: (a: A) => string): <I>(self: Schema.Schema<I, A>) => Schema.Schema<I, A>
  <I, A>(self: Schema.Schema<I, A>, f: (a: A) => string): Schema.Schema<I, A>
} = internal.withHashString

/**
 * @category annotations
 * @since 1.0.0
 */
export const hash: <I, A>(self: Schema.Schema<I, A>, value: A) => number = internal.hash
