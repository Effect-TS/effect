/**
 * @since 1.0.0
 */
import type { Tag } from "@effect/data/Context"
import type { LazyArg } from "@effect/data/Function"
import type { Deferred } from "@effect/io/Deferred"
import type * as Effect from "@effect/io/Effect"
import type * as Layer from "@effect/io/Layer"
import type { Pool } from "@effect/io/Pool"
import type { Scope } from "@effect/io/Scope"
import * as internal from "@effect/rpc-webworkers/internal/resolver"
import * as worker from "@effect/rpc-webworkers/internal/worker"
import type { RpcTransportError } from "@effect/rpc/Error"
import type * as Resolver from "@effect/rpc/Resolver"

/**
 * @category models
 * @since 1.0.0
 */
export interface WebWorker<E, I, O> {
  readonly run: Effect.Effect<never, E, never>
  readonly send: (request: I) => Effect.Effect<never, E, O>
}

/**
 * @category models
 * @since 1.0.0
 */
export interface WebWorkerQueue<E, I, O> {
  readonly offer: (
    item: readonly [request: I, deferred: Deferred<E, O>],
  ) => Effect.Effect<never, never, void>

  readonly take: Effect.Effect<
    never,
    never,
    readonly [request: I, deferred: Deferred<E, O>]
  >
}

/**
 * @category models
 * @since 1.0.0
 */
export interface WebWorkerOptions<E, I, O> {
  readonly payload: (value: I) => unknown
  readonly transferables: (value: I) => Array<Transferable>
  readonly onError: (error: ErrorEvent) => E
  readonly permits: number
  readonly makeQueue?: Effect.Effect<never, never, WebWorkerQueue<E, I, O>>
}

/**
 * @category constructors
 * @since 1.0.0
 */
export const makeWorker: <E, I, O>(
  evaluate: LazyArg<Worker>,
  options: WebWorkerOptions<E, I, O>,
) => Effect.Effect<never, never, WebWorker<E, I, O>> = worker.make

/**
 * @category models
 * @since 1.0.0
 */
export interface RpcWebWorker
  extends WebWorker<
    RpcTransportError,
    Resolver.RpcRequest,
    Resolver.RpcResponse
  > {}

/**
 * @category tags
 * @since 1.0.0
 */
export interface RpcWorkerQueue
  extends WebWorkerQueue<
    RpcTransportError,
    Resolver.RpcRequest,
    Resolver.RpcResponse
  > {}

/**
 * @category tags
 * @since 1.0.0
 */
export const RpcWorkerQueue: Tag<RpcWorkerQueue, RpcWorkerQueue> =
  internal.RpcWorkerQueue

/**
 * @category tags
 * @since 1.0.0
 */
export interface RpcWorkerPool extends Pool<never, RpcWebWorker> {}

/**
 * @category tags
 * @since 1.0.0
 */
export const RpcWorkerPool: Tag<RpcWorkerPool, RpcWorkerPool> =
  internal.RpcWorkerPool

/**
 * @category constructors
 * @since 1.0.0
 */
export const makePool: <R, E>(
  create: (
    spawn: (
      evaluate: LazyArg<Worker>,
      permits?: number,
    ) => Effect.Effect<Scope, never, RpcWebWorker>,
  ) => Effect.Effect<R, E, RpcWorkerPool>,
) => Effect.Effect<R, E, RpcWorkerPool> = internal.makePool

/**
 * @category constructors
 * @since 1.0.0
 */
export const makePoolLayer: <R, E>(
  create: (
    spawn: (
      evaluate: LazyArg<Worker>,
      permits?: number,
    ) => Effect.Effect<Scope, never, RpcWebWorker>,
  ) => Effect.Effect<R, E, RpcWorkerPool>,
) => Layer.Layer<Exclude<R, Scope>, E, RpcWorkerPool> = internal.makePoolLayer

/**
 * @category constructors
 * @since 1.0.0
 */
export const make: Effect.Effect<
  RpcWorkerPool,
  never,
  Resolver.RpcResolver<never>
> = internal.make

/**
 * @category tags
 * @since 1.0.0
 */
export const RpcWorkerResolverLive: Layer.Layer<
  RpcWorkerPool,
  never,
  Resolver.RpcResolver<never>
> = internal.RpcWorkerResolverLive
