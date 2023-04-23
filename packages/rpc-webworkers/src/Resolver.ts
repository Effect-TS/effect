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
 * @category tags
 * @since 1.0.0
 */
export interface WebWorkerResolver {
  readonly _: unique symbol
}

/**
 * @category tags
 * @since 1.0.0
 */
export const WebWorkerResolver: Tag<
  WebWorkerResolver,
  Resolver.RpcResolver<never>
> = internal.WebWorkerResolver

/**
 * @category models
 * @since 1.0.0
 */
export interface WebWorkerPoolConstructor {
  (
    spawn: Effect.Effect<
      Scope,
      never,
      WebWorker<RpcTransportError, Resolver.RpcRequest, Resolver.RpcResponse>
    >,
    size: number,
  ): Effect.Effect<
    Scope,
    never,
    Pool<
      never,
      WebWorker<RpcTransportError, Resolver.RpcRequest, Resolver.RpcResponse>
    >
  >
}

/**
 * @category constructors
 * @since 1.0.0
 */
export const makeEffect: (
  evaluate: LazyArg<Worker>,
  options?: {
    size?: Effect.Effect<never, never, number>
    workerPermits?: number
    makePool?: WebWorkerPoolConstructor
    makeWorkerQueue?: Effect.Effect<
      never,
      never,
      WebWorkerQueue<
        RpcTransportError,
        Resolver.RpcRequest,
        Resolver.RpcResponse
      >
    >
  },
) => Effect.Effect<Scope, never, Resolver.RpcResolver<never>> =
  internal.makeEffect

/**
 * @category constructors
 * @since 1.0.0
 */
export const makeLayer: (
  evaluate: LazyArg<Worker>,
  options?: {
    size?: Effect.Effect<never, never, number>
    workerPermits?: number
    makePool?: WebWorkerPoolConstructor
    makeWorkerQueue?: Effect.Effect<
      never,
      never,
      WebWorkerQueue<
        RpcTransportError,
        Resolver.RpcRequest,
        Resolver.RpcResponse
      >
    >
  },
) => Layer.Layer<never, never, WebWorkerResolver> = internal.makeLayer

/**
 * @category constructors
 * @since 1.0.0
 */
export const make: (
  pool: Pool<
    never,
    WebWorker<RpcTransportError, Resolver.RpcRequest, Resolver.RpcResponse>
  >,
) => Resolver.RpcResolver<never> = internal.make
