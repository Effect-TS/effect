/**
 * @since 1.0.0
 */
import type { Tag } from "@effect/data/Context"
import type { LazyArg } from "@effect/data/Function"
import type * as Effect from "@effect/io/Effect"
import type * as Layer from "@effect/io/Layer"
import type { Pool } from "@effect/io/Pool"
import * as internal from "@effect/rpc-webworkers/internal/resolver"
import type * as Resolver from "@effect/rpc/Resolver"

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
 * @category layers
 * @since 1.0.0
 */
export const WebWorkerResolverLive: (
  evaluate: LazyArg<Worker>,
  { size }?: { size?: Effect.Effect<never, never, number> },
) => Layer.Layer<never, never, WebWorkerResolver> =
  internal.WebWorkerResolverLive

/**
 * @category constructors
 * @since 1.0.0
 */
export const make: (pool: Pool<never, Worker>) => Resolver.RpcResolver<never> =
  internal.make
