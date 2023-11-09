/**
 * @since 1.0.0
 */
import type * as Worker from "@effect/platform/Worker"
import type { RpcTransportError } from "@effect/rpc/Error"
import type * as Resolver from "@effect/rpc/Resolver"
import type { Tag } from "effect/Context"
import type * as Effect from "effect/Effect"
import type * as Layer from "effect/Layer"
import type { Scope } from "effect/Scope"
import * as internal from "./internal/resolver.js"

/**
 * @category tags
 * @since 1.0.0
 */
export interface RpcWorkerPool
  extends Worker.WorkerPool<Resolver.RpcRequest, RpcTransportError, Resolver.RpcResponse>
{}

/**
 * @category models
 * @since 1.0.0
 */
export declare namespace RpcWorkerPool {
  /**
   * @category models
   * @since 1.0.0
   */
  export type Options =
    & Omit<Worker.Worker.Options<Resolver.RpcRequest>, "transfers" | "encode" | "onCreate">
    & ({
      readonly size: number
    })
}

/**
 * @category tags
 * @since 1.0.0
 */
export const RpcWorkerPool: Tag<RpcWorkerPool, RpcWorkerPool> = internal.RpcWorkerPool

/**
 * @category constructors
 * @since 1.0.0
 */
export const makePool: (
  options: RpcWorkerPool.Options
) => Effect.Effect<Scope | Worker.WorkerManager, never, RpcWorkerPool> = internal.makePool

/**
 * @category constructors
 * @since 1.0.0
 */
export const makePoolLayer: (
  options: RpcWorkerPool.Options
) => Layer.Layer<Worker.WorkerManager, never, RpcWorkerPool> = internal.makePoolLayer

/**
 * @category constructors
 * @since 1.0.0
 */
export const make: (pool: RpcWorkerPool) => Resolver.RpcResolver<never> = internal.make

/**
 * @category constructors
 * @since 1.0.0
 */
export const makeFromContext: Effect.Effect<RpcWorkerPool, never, Resolver.RpcResolver<never>> =
  internal.makeFromContext
