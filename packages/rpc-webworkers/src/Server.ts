/**
 * @since 1.0.0
 */
import type { Effect } from "@effect/io/Effect"
import type { Scope } from "@effect/io/Scope"
import type { Span } from "@effect/io/Tracer"
import * as internal from "@effect/rpc-webworkers/internal/server"
import type { RpcHandlers, RpcRouter } from "@effect/rpc/Router"

/**
 * @category models
 * @since 1.0.0
 */
export interface RpcWorkerHandler<R extends RpcRouter.Base> {
  (
    message: MessageEvent<any>
  ): Effect<Exclude<RpcHandlers.Services<R["handlers"]>, Span>, never, void>
}

/**
 * @category models
 * @since 1.0.0
 */
export type RpcWorker<R extends RpcRouter.Base> = R extends RpcRouter.WithSetup ? Effect<
    Exclude<
      RpcHandlers.Services<R["handlers"]>,
      Span | RpcRouter.SetupServices<R>
    >,
    never,
    void
  >
  : Effect<Exclude<RpcHandlers.Services<R["handlers"]>, Span>, never, void>

/**
 * @category constructors
 * @since 1.0.0
 */
export const make: <Router extends RpcRouter.Base>(
  router: Router
) => RpcWorker<Router> = internal.make as any

/**
 * @category constructors
 * @since 1.0.0
 */
export const makeHandler: {
  <R extends RpcRouter.WithSetup>(
    router: R
  ): Effect<
    Scope,
    never,
    (port: typeof globalThis | MessagePort) => RpcWorkerHandler<R>
  >
  <R extends RpcRouter.WithoutSetup>(
    router: R
  ): (port: typeof globalThis | MessagePort) => RpcWorkerHandler<R>
} = internal.makeHandler as any
