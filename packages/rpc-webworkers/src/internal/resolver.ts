import * as WW from "@effect/rpc-webworkers/internal/worker"
import type * as WWResolver from "@effect/rpc-webworkers/Resolver"
import * as schema from "@effect/rpc-webworkers/Schema"
import { RpcTransportError } from "@effect/rpc/Error"
import * as Resolver from "@effect/rpc/Resolver"
import { Tag } from "effect/Context"
import * as Effect from "effect/Effect"
import type { LazyArg } from "effect/Function"
import { pipe } from "effect/Function"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as Ref from "effect/Ref"
import type { Scope } from "effect/Scope"

/** @internal */
export const RpcWorkerQueue = Tag<WWResolver.RpcWorkerQueue>()

/** @internal */
export const RpcWorkerPool = Tag<WWResolver.RpcWorkerPool>()

const getQueue = Effect.flatMap(
  Effect.serviceOption(RpcWorkerQueue),
  Option.match({
    onNone: WW.defaultQueue<
      RpcTransportError,
      Resolver.RpcRequest,
      Resolver.RpcResponse
    >,
    onSome: Effect.succeed
  })
)

/** @internal */
export const makePool = <R, E>(
  create: (
    spawn: (
      evaluate: (id: number) => Worker | SharedWorker,
      permits?: number
    ) => Effect.Effect<Scope, never, WWResolver.RpcWebWorker>
  ) => Effect.Effect<R, E, WWResolver.RpcWorkerPool>
) =>
  Effect.flatMap(
    Effect.all([getQueue, Ref.make(0)]),
    ([queue, ref]) =>
      create((evaluate, permits = 1) =>
        Effect.flatMap(
          Ref.getAndUpdate(ref, (n) => n + 1),
          (id) => makeWorker(() => evaluate(id), permits, queue)
        )
      )
  )

/** @internal */
export const makePoolLayer = <R, E>(
  create: (
    spawn: (
      evaluate: (id: number) => Worker | SharedWorker,
      permits?: number
    ) => Effect.Effect<Scope, never, WWResolver.RpcWebWorker>
  ) => Effect.Effect<R, E, WWResolver.RpcWorkerPool>
) => Layer.scoped(RpcWorkerPool, makePool(create))

const makeWorker = (
  evaluate: LazyArg<Worker | SharedWorker>,
  permits: number,
  queue: WWResolver.WebWorkerQueue<
    RpcTransportError,
    Resolver.RpcRequest,
    Resolver.RpcResponse
  >
) =>
  Effect.tap(
    WW.make<RpcTransportError, Resolver.RpcRequest, Resolver.RpcResponse>(
      evaluate,
      {
        permits,
        makeQueue: Effect.succeed(queue),
        onError: (error) => RpcTransportError({ error }),
        payload: (request) => request.payload,
        transferables: (request) =>
          "input" in request.schema
            ? schema.getTransferables(
              request.schema.input,
              request.payload.input
            )
            : []
      }
    ),
    (worker) => pipe(Effect.ignoreLogged(worker.run), Effect.forever, Effect.forkScoped)
  )

/** @internal */
export const make = Effect.map(
  RpcWorkerPool,
  (pool) =>
    Resolver.makeSingleWithSchema((request) =>
      Effect.flatMap(Effect.scoped(pool.get()), (worker) => worker.send(request))
    )
)

/** @internal */
export const RpcWorkerResolverLive = Layer.effect(Resolver.RpcResolver, make)
