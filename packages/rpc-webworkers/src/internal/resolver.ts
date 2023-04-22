import { Tag } from "@effect/data/Context"
import type { LazyArg } from "@effect/data/Function"
import { pipe } from "@effect/data/Function"
import * as Effect from "@effect/io/Effect"
import * as Layer from "@effect/io/Layer"
import * as Pool from "@effect/io/Pool"
import type * as WWResolver from "@effect/rpc-webworkers/Resolver"
import * as schema from "@effect/rpc-webworkers/Schema"
import * as WW from "@effect/rpc-webworkers/internal/worker"
import type { RpcTransportError } from "@effect/rpc/Error"
import * as Resolver from "@effect/rpc/Resolver"

/** @internal */
export const WebWorkerResolver = Tag<
  WWResolver.WebWorkerResolver,
  Resolver.RpcResolver<never>
>()

const defaultSize = Effect.sync(() => navigator.hardwareConcurrency)

/** @internal */
export const makeEffect = (
  evaluate: LazyArg<Worker>,
  {
    size = defaultSize,
    workerPermits = 1,
  }: {
    size?: Effect.Effect<never, never, number>
    workerPermits?: number
  } = {},
) =>
  pipe(
    Effect.flatMap(size, (size) =>
      Pool.make(makeWorker(evaluate, workerPermits), size),
    ),
    Effect.map(make),
  )

/** @internal */
export const makeLayer = (
  evaluate: LazyArg<Worker>,
  options?: {
    size?: Effect.Effect<never, never, number>
    workerPermits?: number
  },
) => Layer.scoped(WebWorkerResolver, makeEffect(evaluate, options))

const makeWorker = (evaluate: LazyArg<Worker>, permits: number) =>
  pipe(
    WW.make<RpcTransportError, Resolver.RpcRequest, Resolver.RpcResponse>(
      evaluate,
      {
        permits,
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
    Effect.tap((worker) =>
      pipe(
        worker.run,
        Effect.retryWhile(() => true),
        Effect.forkScoped,
      ),
    ),
  )

/** @internal */
export const make = (
  pool: Pool.Pool<
    never,
    WWResolver.WebWorker<
      RpcTransportError,
      Resolver.RpcRequest,
      Resolver.RpcResponse
    >
  >,
): Resolver.RpcResolver<never> =>
  Resolver.makeSingleWithSchema((request) =>
    Effect.flatMap(Effect.scoped(pool.get()), (worker) => worker.send(request)),
  )
