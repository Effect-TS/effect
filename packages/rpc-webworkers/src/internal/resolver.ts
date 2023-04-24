import { Tag } from "@effect/data/Context"
import * as Option from "@effect/data/Option"
import type { LazyArg } from "@effect/data/Function"
import { pipe } from "@effect/data/Function"
import * as Effect from "@effect/io/Effect"
import * as Layer from "@effect/io/Layer"
import type * as WWResolver from "@effect/rpc-webworkers/Resolver"
import * as schema from "@effect/rpc-webworkers/Schema"
import * as WW from "@effect/rpc-webworkers/internal/worker"
import type { RpcTransportError } from "@effect/rpc/Error"
import * as Resolver from "@effect/rpc/Resolver"
import type { Scope } from "@effect/io/Scope"

/** @internal */
export const RpcWorkerQueue = Tag<WWResolver.RpcWorkerQueue>()

/** @internal */
export const RpcWorkerPool = Tag<WWResolver.RpcWorkerPool>()

const getQueue = Effect.flatMap(
  Effect.serviceOption(RpcWorkerQueue),
  Option.match(
    WW.defaultQueue<
      RpcTransportError,
      Resolver.RpcRequest,
      Resolver.RpcResponse
    >,
    Effect.succeed,
  ),
)

/** @internal */
export const makePool = <R, E>(
  create: (
    spawn: (
      evaluate: LazyArg<Worker>,
      permits?: number,
    ) => Effect.Effect<Scope, never, WWResolver.RpcWebWorker>,
  ) => Effect.Effect<R, E, WWResolver.RpcWorkerPool>,
) =>
  Effect.flatMap(getQueue, (queue) =>
    create((evaluate, permits = 1) => makeWorker(evaluate, permits, queue)),
  )

/** @internal */
export const makePoolLayer = <R, E>(
  create: (
    spawn: (
      evaluate: LazyArg<Worker>,
      permits?: number,
    ) => Effect.Effect<Scope, never, WWResolver.RpcWebWorker>,
  ) => Effect.Effect<R, E, WWResolver.RpcWorkerPool>,
) => Layer.scoped(RpcWorkerPool, makePool(create))

const makeWorker = (
  evaluate: LazyArg<Worker>,
  permits: number,
  queue: WWResolver.WebWorkerQueue<
    RpcTransportError,
    Resolver.RpcRequest,
    Resolver.RpcResponse
  >,
) =>
  Effect.tap(
    WW.make<RpcTransportError, Resolver.RpcRequest, Resolver.RpcResponse>(
      evaluate,
      {
        permits,
        makeQueue: Effect.succeed(queue),
        onError: (error) => ({ _tag: "RpcTransportError", error }),
        payload: (request) => request.payload,
        transferables: (request) =>
          "input" in request.schema
            ? schema.getTransferables(
                request.schema.input,
                request.payload.input,
              )
            : [],
      },
    ),
    (worker) =>
      pipe(Effect.ignoreLogged(worker.run), Effect.forever, Effect.forkScoped),
  )

/** @internal */
export const make = Effect.map(RpcWorkerPool, (pool) =>
  Resolver.makeSingleWithSchema((request) =>
    Effect.flatMap(Effect.scoped(pool.get()), (worker) => worker.send(request)),
  ),
)

/** @internal */
export const RpcWorkerResolverLive = Layer.effect(Resolver.RpcResolver, make)
