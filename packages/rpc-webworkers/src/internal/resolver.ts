import { Tag } from "@effect/data/Context"
import type { LazyArg } from "@effect/data/Function"
import { pipe } from "@effect/data/Function"
import * as Effect from "@effect/io/Effect"
import * as Layer from "@effect/io/Layer"
import * as Pool from "@effect/io/Pool"
import type * as WWResolver from "@effect/rpc-webworkers/Resolver"
import * as schema from "@effect/rpc-webworkers/Schema"
import type { RpcTransportError } from "@effect/rpc/Error"
import * as Resolver from "@effect/rpc/Resolver"

/** @internal */
export const WebWorkerResolver = Tag<
  WWResolver.WebWorkerResolver,
  Resolver.RpcResolver<never>
>()

const defaultSize = Effect.sync(() => navigator.hardwareConcurrency)

const makeWorker = (evaluate: LazyArg<Worker>) =>
  Effect.acquireRelease(Effect.sync(evaluate), (worker) =>
    Effect.sync(() => worker.terminate()),
  )

/** @internal */
export const WebWorkerResolverLive = (
  evaluate: LazyArg<Worker>,
  { size = defaultSize }: { size?: Effect.Effect<never, never, number> } = {},
) =>
  Layer.scoped(
    WebWorkerResolver,
    pipe(
      Effect.flatMap(size, (size) => Pool.make(makeWorker(evaluate), size)),
      Effect.map(make),
    ),
  )

/** @internal */
export const make = (
  pool: Pool.Pool<never, Worker>,
): Resolver.RpcResolver<never> =>
  Resolver.makeSingleWithSchema((request) =>
    pipe(
      pool.get(),
      Effect.flatMap((worker) =>
        pipe(
          Effect.asyncInterrupt<never, RpcTransportError, unknown>((resume) => {
            const controller = new AbortController()
            const signal = controller.signal

            const onError = (error: ErrorEvent) => {
              resume(Effect.fail({ _tag: "RpcTransportError", error }))
            }
            worker.addEventListener("error", onError, { once: true, signal })
            worker.addEventListener(
              "message",
              (event) => {
                worker.removeEventListener("error", onError)
                resume(Effect.succeed(event.data))
              },
              { once: true, signal },
            )

            const transfer =
              "input" in request.schema
                ? schema.getTransferables(
                    request.schema.input,
                    request.payload.input,
                  )
                : []
            worker.postMessage(request.payload, { transfer })

            return Effect.sync(() => controller.abort())
          }),
          Effect.tapErrorCause(() => pool.invalidate(worker)),
        ),
      ),
      Effect.scoped,
    ),
  )
