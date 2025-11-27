/**
 * @since 1.0.0
 */
import type { Headers } from "@effect/platform/Headers"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Schema from "effect/Schema"
import { Scope } from "effect/Scope"
import type { Mutable } from "effect/Types"
import type * as Rpc from "./Rpc.js"
import type { Request } from "./RpcMessage.js"

/**
 * @since 1.0.0
 * @category type ids
 */
export const TypeId: unique symbol = Symbol.for("@effect/rpc/RpcMiddleware")

/**
 * @since 1.0.0
 * @category type ids
 */
export type TypeId = typeof TypeId

/**
 * @since 1.0.0
 * @category models
 */
export interface RpcMiddleware<Provides, E> {
  (options: {
    readonly clientId: number
    readonly rpc: Rpc.AnyWithProps
    readonly payload: unknown
    readonly headers: Headers
  }): Effect.Effect<Provides, E>
}

/**
 * @since 1.0.0
 * @category models
 */
export interface RpcMiddlewareWrap<Provides, E> {
  (options: {
    readonly clientId: number
    readonly rpc: Rpc.AnyWithProps
    readonly payload: unknown
    readonly headers: Headers
    readonly next: Effect.Effect<SuccessValue, E, Provides>
  }): Effect.Effect<SuccessValue, E>
}

/**
 * @since 1.0.0
 * @category models
 */
export interface SuccessValue {
  readonly _: unique symbol
}

/**
 * @since 1.0.0
 * @category models
 */
export interface RpcMiddlewareClient<R = never> {
  (options: {
    readonly rpc: Rpc.AnyWithProps
    readonly request: Request<Rpc.Any>
  }): Effect.Effect<Request<Rpc.Any>, never, R>
}

/**
 * @since 1.0.0
 * @category models
 */
export interface ForClient<Id> {
  readonly _: unique symbol
  readonly id: Id
}

/**
 * @since 1.0.0
 * @category models
 */
export interface Any {
  (options: {
    readonly rpc: Rpc.AnyWithProps
    readonly payload: unknown
    readonly headers: Headers
    readonly next?: Effect.Effect<any, any, any>
  }): Effect.Effect<any, any>
}

/**
 * @since 1.0.0
 * @category models
 */
export interface TagClass<
  Self,
  Name extends string,
  Options
> extends
  TagClass.Base<
    Self,
    Name,
    Options,
    TagClass.Wrap<Options> extends true ? RpcMiddlewareWrap<
        TagClass.Provides<Options>,
        TagClass.Failure<Options>
      > :
      RpcMiddleware<
        TagClass.Service<Options>,
        TagClass.FailureService<Options>
      >
  >
{}

/**
 * @since 1.0.0
 * @category models
 */
export declare namespace TagClass {
  /**
   * @since 1.0.0
   * @category models
   */
  export type Provides<Options> = Options extends {
    readonly provides: Context.Tag<any, any>
    readonly optional?: false
  } ? Context.Tag.Identifier<Options["provides"]>
    : never

  /**
   * @since 1.0.0
   * @category models
   */
  export type Service<Options> = Options extends { readonly provides: Context.Tag<any, any> }
    ? Context.Tag.Service<Options["provides"]>
    : void

  /**
   * @since 1.0.0
   * @category models
   */
  export type FailureSchema<Options> = Options extends
    { readonly failure: Schema.Schema.All; readonly optional?: false } ? Options["failure"]
    : typeof Schema.Never

  /**
   * @since 1.0.0
   * @category models
   */
  export type Failure<Options> = Options extends
    { readonly failure: Schema.Schema<infer _A, infer _I, infer _R>; readonly optional?: false } ? _A
    : never

  /**
   * @since 1.0.0
   * @category models
   */
  export type FailureContext<Options> = Schema.Schema.Context<FailureSchema<Options>>

  /**
   * @since 1.0.0
   * @category models
   */
  export type FailureService<Options> = Optional<Options> extends true ? unknown : Failure<Options>

  /**
   * @since 1.0.0
   * @category models
   */
  export type Optional<Options> = Options extends { readonly optional: true } ? true : false

  /**
   * @since 1.0.0
   * @category models
   */
  export type RequiredForClient<Options> = Options extends { readonly requiredForClient: true } ? true : false

  /**
   * @since 1.0.0
   * @category models
   */
  export type Wrap<Options> = Options extends { readonly wrap: true } ? true : false

  /**
   * @since 1.0.0
   * @category models
   */
  export interface Base<Self, Name extends string, Options, Service> extends Context.Tag<Self, Service> {
    new(_: never): Context.TagClassShape<Name, Service>
    readonly [TypeId]: TypeId
    readonly optional: Optional<Options>
    readonly failure: FailureSchema<Options>
    readonly provides: Options extends { readonly provides: Context.Tag<any, any> } ? Options["provides"]
      : undefined
    readonly requiredForClient: RequiredForClient<Options>
    readonly wrap: Wrap<Options>
  }
}

/**
 * @since 1.0.0
 * @category models
 */
export interface TagClassAny extends Context.Tag<any, any> {
  readonly [TypeId]: TypeId
  readonly optional: boolean
  readonly provides?: Context.Tag<any, any> | undefined
  readonly failure: Schema.Schema.All
  readonly requiredForClient: boolean
  readonly wrap: boolean
}

/**
 * @since 1.0.0
 * @category models
 */
export interface TagClassAnyWithProps extends Context.Tag<any, RpcMiddleware<any, any> | RpcMiddlewareWrap<any, any>> {
  readonly [TypeId]: TypeId
  readonly optional: boolean
  readonly provides?: Context.Tag<any, any>
  readonly failure: Schema.Schema.All
  readonly requiredForClient: boolean
  readonly wrap: boolean
}

/**
 * @since 1.0.0
 * @category tags
 */
export const Tag = <Self>(): <
  const Name extends string,
  const Options extends {
    readonly wrap?: boolean
    readonly optional?: boolean
    readonly failure?: Schema.Schema.All
    readonly provides?: Context.Tag<any, any>
    readonly requiredForClient?: boolean
  }
>(
  id: Name,
  options?: Options | undefined
) => TagClass<Self, Name, Options> =>
(
  id: string,
  options?: {
    readonly optional?: boolean
    readonly failure?: Schema.Schema.All
    readonly provides?: Context.Tag<any, any>
    readonly requiredForClient?: boolean
    readonly wrap?: boolean
  }
) => {
  const Err = globalThis.Error as any
  const limit = Err.stackTraceLimit
  Err.stackTraceLimit = 2
  const creationError = new Err()
  Err.stackTraceLimit = limit

  function TagClass() {}
  const TagClass_ = TagClass as any as Mutable<TagClassAny>
  Object.setPrototypeOf(TagClass, Object.getPrototypeOf(Context.GenericTag<Self, any>(id)))
  TagClass.key = id
  Object.defineProperty(TagClass, "stack", {
    get() {
      return creationError.stack
    }
  })
  TagClass_[TypeId] = TypeId
  TagClass_.failure = options?.optional === true || options?.failure === undefined ? Schema.Never : options.failure
  if (options?.provides) {
    TagClass_.provides = options.provides
  }
  TagClass_.optional = options?.optional ?? false
  TagClass_.requiredForClient = options?.requiredForClient ?? false
  TagClass_.wrap = options?.wrap ?? false
  return TagClass as any
}

/**
 * @since 1.0.0
 * @category client
 */
export const layerClient = <Id, S, R, EX = never, RX = never>(
  tag: Context.Tag<Id, S>,
  service: RpcMiddlewareClient<R> | Effect.Effect<RpcMiddlewareClient<R>, EX, RX>
): Layer.Layer<ForClient<Id>, EX, R | Exclude<RX, Scope>> =>
  Layer.scopedContext(Effect.gen(function*() {
    const context = (yield* Effect.context<R | Scope>()).pipe(
      Context.omit(Scope)
    ) as Context.Context<R>
    const middleware = Effect.isEffect(service) ? yield* service : service
    return Context.unsafeMake(
      new Map([[
        `${tag.key}/Client`,
        (options: any) =>
          Effect.mapInputContext(
            middleware(options),
            (requestContext) => Context.merge(context, requestContext)
          )
      ]])
    )
  }))
