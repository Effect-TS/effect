import * as Worker from "@effect/platform/Worker"
import { RpcTransportError } from "@effect/rpc/Error"
import * as Resolver from "@effect/rpc/Resolver"
import { Tag } from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import type { Scope } from "effect/Scope"
import type * as WWResolver from "../Resolver"
import * as schema from "../Schema"

/** @internal */
export const RpcWorkerPool = Tag<WWResolver.RpcWorkerPool>()

/** @internal */
export const makePool = (
  options: WWResolver.RpcWorkerPool.Options
): Effect.Effect<Scope | Worker.WorkerManager, never, WWResolver.RpcWorkerPool> =>
  Worker.makePool<unknown>()({
    ...options,
    encode(message) {
      return message.payload
    },
    transfers(message) {
      return "input" in message.schema
        ? schema.getTransferables(message.schema.input, message.payload.input)
        : []
    }
  })

/** @internal */
export const makePoolLayer = (
  options: WWResolver.RpcWorkerPool.Options
) => Layer.scoped(RpcWorkerPool, makePool(options))

/** @internal */
export const make = (pool: WWResolver.RpcWorkerPool) =>
  Resolver.makeSingleWithSchema((request) =>
    Effect.catchTag(
      pool.executeEffect(request),
      "WorkerError",
      (error) => Effect.fail(RpcTransportError({ error }))
    )
  )

/** @internal */
export const makeFromContext = Effect.map(RpcWorkerPool, make)
