/**
 * @since 1.0.0
 */
import type { Effect } from "effect/Effect"
import type { Option } from "effect/Option"
import type { Scope } from "effect/Scope"
import type { RpcDecodeFailure, RpcEncodeFailure } from "./Error.js"
import * as internal from "./internal/server.js"
import type { RpcResponse } from "./Resolver.js"
import type { RpcHandler, RpcHandlers, RpcRouter } from "./Router.js"
import type { RpcRequestSchema, RpcSchema, RpcService } from "./Schema.js"

/**
 * @category constructors
 * @since 1.0.0
 */
export const handler: {
  <const R extends RpcRouter.WithSetup>(
    router: R
  ): Effect<
    (
      request: unknown
    ) => Effect<
      ReadonlyArray<RpcResponse>,
      never,
      Exclude<
        RpcHandlers.Services<R["handlers"]>,
        RpcRouter.SetupServices<R>
      >
    >,
    never,
    Scope
  >
  <const R extends RpcRouter.WithoutSetup>(
    router: R
  ): (
    request: unknown
  ) => Effect<
    ReadonlyArray<RpcResponse>,
    never,
    RpcHandlers.Services<R["handlers"]>
  >
} = internal.handler

/**
 * @category constructors
 * @since 1.0.0
 */
export const handlerRaw: <const R extends RpcRouter.Base>(
  router: R
) => <Req extends RpcRequestSchema.To<R["schema"], "">>(
  request: Req
) => Req extends { _tag: infer M } ? RpcHandler.FromMethod<R["handlers"], M, never, RpcEncodeFailure>
  : never = internal.handlerRaw as any

/**
 * @category constructors
 * @since 1.0.0
 */
export const handleSingle: {
  <const R extends RpcRouter.WithSetup>(
    router: R
  ): Effect<
    (
      request: unknown
    ) => Effect<
      RpcResponse,
      never,
      Exclude<
        RpcHandlers.Services<R["handlers"]>,
        RpcRouter.SetupServices<R>
      >
    >,
    never,
    Scope
  >
  <R extends RpcRouter.WithoutSetup>(
    router: R
  ): (
    request: unknown
  ) => Effect<
    RpcResponse,
    never,
    RpcHandlers.Services<R["handlers"]>
  >
} = internal.handleSingle as any

/**
 * @category constructors
 * @since 1.0.0
 */
export const handleSingleWithSchema: {
  <const R extends RpcRouter.WithSetup>(
    router: R
  ): Effect<
    (
      request: unknown
    ) => Effect<
      readonly [RpcResponse, Option<RpcSchema.Base>],
      never,
      Exclude<
        RpcHandlers.Services<R["handlers"]>,
        RpcRouter.SetupServices<R>
      >
    >,
    never,
    Scope
  >
  <R extends RpcRouter.WithoutSetup>(
    router: R
  ): (
    request: unknown
  ) => Effect<
    readonly [RpcResponse, Option<RpcSchema.Base>],
    never,
    RpcHandlers.Services<R["handlers"]>
  >
} = internal.handleSingleWithSchema as any

/**
 * @category models
 * @since 1.0.0
 */
export interface UndecodedRpcResponse<M, O> {
  readonly __rpc: M
  readonly __output: O
}

/**
 * @category models
 * @since 1.0.0
 */
export type RpcUndecodedClient<H extends RpcHandlers, P extends string = "", Depth extends ReadonlyArray<number> = []> =
  {
    readonly [K in Extract<keyof H, string>]: H[K] extends {
      readonly handlers: RpcHandlers
    } ? Depth["length"] extends 3 ? never : RpcUndecodedClient<H[K]["handlers"], `${P}${K}.`, [0, ...Depth]>
      : H[K] extends RpcHandler.IO<infer R, infer E, infer I, infer O> ? (
          input: I
        ) => Effect<
          UndecodedRpcResponse<`${P}${K}`, O>,
          E | RpcEncodeFailure | RpcDecodeFailure,
          R
        >
      : H[K] extends Effect<infer O, infer E, infer R> ? Effect<
          UndecodedRpcResponse<`${P}${K}`, O>,
          E | RpcEncodeFailure | RpcDecodeFailure,
          R
        >
      : never
  }

/**
 * @category constructors
 * @since 1.0.0
 */
export const makeUndecodedClient: <
  const S extends RpcService.DefinitionWithId,
  const H extends RpcHandlers.FromService<S>
>(
  schemas: S,
  handlers: H,
  options: RpcRouter.Options
) => RpcUndecodedClient<H> = internal.makeUndecodedClient

/**
 * @category utils
 * @since 1.0.0
 */
export interface RpcServer {
  (request: unknown): Effect<ReadonlyArray<RpcResponse>>
}

/**
 * @category utils
 * @since 1.0.0
 */
export interface RpcServerSingle {
  (request: unknown): Effect<RpcResponse>
}

/**
 * @category utils
 * @since 1.0.0
 */
export interface RpcServerSingleWithSchema {
  (
    request: unknown
  ): Effect<readonly [RpcResponse, Option<RpcSchema.Base>]>
}
