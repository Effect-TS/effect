/**
 * @since 1.0.0
 */
import type { Effect } from "@effect/io/Effect"
import type { RpcSchema, RpcService } from "@effect/rpc/Schema"
import type { RpcUndecodedClient } from "@effect/rpc/Server"
import * as internal from "@effect/rpc/internal/router"
import type { Tag } from "@effect/data/Context"
import type { LazyArg } from "@effect/data/Function"

/**
 * @category handler models
 * @since 1.0.0
 */
export type RpcHandler<R, E, I, O> =
  | RpcHandler.IO<R, E, I, O>
  | RpcHandler.NoInput<R, E, O>

/**
 * @since 1.0.0
 */
export namespace RpcHandler {
  /**
   * @category handler models
   * @since 1.0.0
   */
  export type IO<R, E, I, O> = (input: I) => Effect<R, E, O>
  /**
   * @category handler models
   * @since 1.0.0
   */
  export type NoInput<R, E, O> = Effect<R, E, O>

  /**
   * @category handler models
   * @since 1.0.0
   */
  export type Any = RpcHandler<any, any, any, any>

  /**
   * @category handler utils
   * @since 1.0.0
   */
  export type FromSchema<C extends RpcSchema.Any> = C extends RpcSchema.IO<
    infer _IE,
    infer E,
    infer _II,
    infer I,
    infer _IO,
    infer O
  >
    ? IO<any, E, I, O>
    : C extends RpcSchema.NoError<infer _II, infer I, infer _IO, infer O>
    ? IO<any, never, I, O>
    : C extends RpcSchema.NoInput<infer _IE, infer E, infer _IO, infer O>
    ? NoInput<any, E, O>
    : C extends RpcSchema.NoInputNoError<infer _IO, infer O>
    ? NoInput<any, never, O>
    : never

  /**
   * @category handler utils
   * @since 1.0.0
   */
  export type FromMethod<H extends RpcHandlers, M, XR, E2> = Extract<
    RpcHandlers.Map<H, XR, E2>,
    [M, any]
  > extends [infer _M, infer T]
    ? T
    : never
}

/**
 * @category handlers models
 * @since 1.0.0
 */
export interface RpcHandlers
  extends Record<string, RpcHandler.Any | { handlers: RpcHandlers }> {}

/**
 * @since 1.0.0
 */
export namespace RpcHandlers {
  /**
   * @category handlers utils
   * @since 1.0.0
   */
  export type FromService<S extends RpcService.DefinitionWithId> = {
    readonly [K in Extract<
      keyof S,
      string
    >]: S[K] extends RpcService.DefinitionWithId
      ? { handlers: FromService<S[K]> }
      : S[K] extends RpcSchema.Any
      ? RpcHandler.FromSchema<S[K]>
      : never
  }

  /**
   * @category handlers utils
   * @since 1.0.0
   */
  export type Services<H extends RpcHandlers> = H[keyof H] extends RpcHandler<
    infer R,
    any,
    any,
    any
  >
    ? R
    : never

  /**
   * @category handlers utils
   * @since 1.0.0
   */
  export type Error<H extends RpcHandlers> = H[keyof H] extends RpcHandler<
    any,
    infer E,
    any,
    any
  >
    ? E
    : never

  /**
   * @category handlers utils
   * @since 1.0.0
   */
  export type Map<H extends RpcHandlers, XR, E2, P extends string = ""> = {
    readonly [K in keyof H]: K extends string
      ? H[K] extends { handlers: RpcHandlers }
        ? Map<H[K]["handlers"], XR, E2, `${P}${K}.`>
        : H[K] extends RpcHandler.IO<infer R, infer E, infer _I, infer O>
        ? [`${P}${K}`, Effect<Exclude<R, XR>, E | E2, O>]
        : H[K] extends Effect<infer R, infer E, infer O>
        ? [`${P}${K}`, Effect<Exclude<R, XR>, E | E2, O>]
        : never
      : never
  }[keyof H]
}

/**
 * @category router models
 * @since 1.0.0
 */
export interface RpcRouter<
  S extends RpcService.DefinitionWithId,
  H extends RpcHandlers,
> extends RpcRouter.Base {
  readonly handlers: H
  readonly schema: S
  readonly undecoded: RpcUndecodedClient<H>
}

/**
 * @since 1.0.0
 */
export namespace RpcRouter {
  /**
   * @category router models
   * @since 1.0.0
   */
  export interface Base {
    readonly handlers: RpcHandlers
    readonly schema: RpcService.DefinitionWithId
    readonly undecoded: RpcUndecodedClient<RpcHandlers>
    readonly options: Options
  }

  /**
   * @category router models
   * @since 1.0.0
   */
  export interface Options {
    readonly spanPrefix: string
  }

  /**
   * @category router utils
   * @since 1.0.0
   */
  export type Provide<Router extends Base, XR, PR, PE> = RpcRouter<
    Router["schema"],
    {
      readonly [M in keyof Router["handlers"]]: Router["handlers"][M] extends Base
        ? Provide<Router["handlers"][M], XR, PR, PE>
        : Router["handlers"][M] extends RpcHandler.IO<
            infer R,
            infer E,
            infer I,
            infer O
          >
        ? RpcHandler.IO<Exclude<R, XR> | PR, E | PE, I, O>
        : Router["handlers"][M] extends RpcHandler.NoInput<
            infer R,
            infer E,
            infer O
          >
        ? RpcHandler.NoInput<Exclude<R, XR> | PR, E | PE, O>
        : never
    }
  >
}

/**
 * @category router constructors
 * @since 1.0.0
 */
export const make: <
  S extends RpcService.DefinitionWithId,
  H extends RpcHandlers.FromService<S>,
>(
  schema: S,
  handlers: H,
  options?: Partial<RpcRouter.Options>,
) => RpcRouter<S, H> = internal.make

/**
 * @category router combinators
 * @since 1.0.0
 */
export const provideService: {
  <T extends Tag<any, any>>(tag: T, service: Tag.Service<T>): <
    Router extends RpcRouter.Base,
  >(
    self: Router,
  ) => RpcRouter.Provide<Router, Tag.Identifier<T>, never, never>
  <Router extends RpcRouter.Base, T extends Tag<any, any>>(
    self: Router,
    tag: T,
    service: Tag.Service<T>,
  ): RpcRouter.Provide<Router, Tag.Identifier<T>, never, never>
} = internal.provideService

/**
 * @category router combinators
 * @since 1.0.0
 */
export const provideServiceEffect: {
  <
    Router extends RpcRouter.Base,
    T extends Tag<any, any>,
    R,
    E extends RpcService.Errors<Router["schema"]>,
  >(
    tag: T,
    effect: Effect<R, E, Tag.Service<T>>,
  ): (self: Router) => RpcRouter.Provide<Router, Tag.Identifier<T>, R, E>
  <
    Router extends RpcRouter.Base,
    T extends Tag<any, any>,
    R,
    E extends RpcService.Errors<Router["schema"]>,
  >(
    self: Router,
    tag: T,
    effect: Effect<R, E, Tag.Service<T>>,
  ): RpcRouter.Provide<Router, Tag.Identifier<T>, R, E>
} = internal.provideServiceEffect

/**
 * @category router combinators
 * @since 1.0.0
 */
export const provideServiceSync: {
  <T extends Tag<any, any>>(tag: T, service: LazyArg<Tag.Service<T>>): <
    Router extends RpcRouter.Base,
  >(
    self: Router,
  ) => RpcRouter.Provide<Router, Tag.Identifier<T>, never, never>
  <Router extends RpcRouter.Base, T extends Tag<any, any>>(
    self: Router,
    tag: T,
    service: LazyArg<Tag.Service<T>>,
  ): RpcRouter.Provide<Router, Tag.Identifier<T>, never, never>
} = internal.provideServiceSync
