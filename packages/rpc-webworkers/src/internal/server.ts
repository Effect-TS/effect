import { flow, pipe } from "@effect/data/Function"
import * as Option from "@effect/data/Option"
import * as Effect from "@effect/io/Effect"
import * as Runtime from "@effect/io/Runtime"
import { getTransferables } from "@effect/rpc-webworkers/Schema"
import type { RpcWorker, RpcWorkerHandler } from "@effect/rpc-webworkers/Server"
import type { RpcRequest } from "@effect/rpc/Resolver"
import type { RpcRouter } from "@effect/rpc/Router"
import * as Server from "@effect/rpc/Server"

/** @internal */
export const makeHandler = <Router extends RpcRouter.Base>(
  router: Router,
): RpcWorkerHandler<Router> => {
  const handler = Server.handleSingleWithSchema(
    router,
  ) as unknown as Server.RpcServerSingleWithSchema

  return (message) => {
    const [id, request] = message.data as [number, RpcRequest.Payload]
    return Effect.flatMap(handler(request), ([response, schema]) =>
      Effect.sync(() => {
        const transfer = pipe(
          Option.map(schema, (schema) =>
            response._tag === "Success"
              ? getTransferables(schema.output, response.value)
              : getTransferables(schema.error, response.error),
          ),
          Option.getOrUndefined,
        )
        return self.postMessage([id, response], { transfer })
      }),
    ) as any
  }
}

/** @internal */
export const make = <Router extends RpcRouter.Base>(
  router: Router,
): RpcWorker<Router> => {
  const handler = makeHandler(router)

  return pipe(
    Effect.runtime<any>(),
    Effect.flatMap((runtime) =>
      Effect.asyncInterrupt<never, never, never>((resume) => {
        const controller = new AbortController()
        const runFork = Runtime.runFork(runtime)
        const handlerWithDie = flow(
          handler,
          Effect.catchAllCause((cause) =>
            Effect.sync(() => resume(Effect.failCause(cause))),
          ),
        )

        self.addEventListener(
          "message",
          (event) => runFork(handlerWithDie(event) as any),
          { signal: controller.signal },
        )

        self.addEventListener(
          "unhandledrejection",
          (event) => {
            throw event.reason
          },
          { signal: controller.signal },
        )

        return Effect.sync(() => controller.abort())
      }),
    ),
  ) as any
}
