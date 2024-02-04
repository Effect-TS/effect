import * as Worker from "@effect/platform/Worker"
import { RpcTransportError } from "@effect/rpc/Error"
import * as Resolver from "@effect/rpc/Resolver"
import { GenericTag } from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import type { Scope } from "effect/Scope"
import type * as WWResolver from "../Resolver.js"
import * as schema from "../Schema.js"

/** @internal */
export const RpcWorkerPool = GenericTag<WWResolver.RpcWorkerPool>("@effect/rpc-workers/RpcWorkerPool")

/** @internal */
export const makePool = (
  options: WWResolver.RpcWorkerPool.Options
): Effect.Effect<WWResolver.RpcWorkerPool, never, Scope | Worker.WorkerManager> =>
  Effect.suspend(() => {
    let setup: any
    return Effect.map(
      Worker.makePool<unknown>()<Resolver.RpcRequest, RpcTransportError, Resolver.RpcResponse>({
        ...options,
        onCreate(worker) {
          if (setup) {
            return Effect.orDie(worker.executeEffect(setup))
          }
          return Effect.unit
        },
        encode(message) {
          return Effect.succeed(message.payload)
        },
        transfers(message) {
          return "input" in message.schema
            ? schema.getTransferables(message.schema.input, message.payload.input)
            : []
        }
      }),
      (pool) => ({
        ...pool,
        broadcast(message) {
          if (message.payload._tag === "__setup") {
            setup = message
          }
          return pool.broadcast(message)
        }
      })
    )
  })

/** @internal */
export const makePoolLayer = (
  options: WWResolver.RpcWorkerPool.Options
) => Layer.scoped(RpcWorkerPool, makePool(options))

/** @internal */
export const make = (pool: WWResolver.RpcWorkerPool) =>
  Resolver.makeSingleWithSchema((request) =>
    Effect.catchTag(
      request.payload._tag === "__setup" ?
        Effect.as(pool.broadcast(request), { _tag: "Success", value: undefined } as const) :
        pool.executeEffect(request),
      "WorkerError",
      (error) => Effect.fail(RpcTransportError({ error }))
    )
  )

/** @internal */
export const makeFromContext = Effect.map(RpcWorkerPool, make)
