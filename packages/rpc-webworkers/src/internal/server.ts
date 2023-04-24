import { pipe } from "@effect/data/Function"
import * as Option from "@effect/data/Option"
import * as Effect from "@effect/io/Effect"
import * as Runtime from "@effect/io/Runtime"
import { getTransferables } from "@effect/rpc-webworkers/Schema"
import type { RpcWorker, RpcWorkerHandler } from "@effect/rpc-webworkers/Server"
import type { RpcRequest, RpcResponse } from "@effect/rpc/Resolver"
import type { RpcRouter } from "@effect/rpc/Router"
import * as Server from "@effect/rpc/Server"

/** @internal */
export const makeHandler = <Router extends RpcRouter.Base>(router: Router) => {
  const handler = Server.handleSingleWithSchema(
    router,
  ) as unknown as Server.RpcServerSingleWithSchema

  return (port: MessagePort | typeof globalThis): RpcWorkerHandler<Router> => {
    return (message) => {
      const [id, request] = message.data as [number, RpcRequest.Payload]
      return pipe(
        handler(request),
        Effect.flatMap(([response, schema]) =>
          Effect.sync(() => {
            const transfer = pipe(
              Option.map(schema, (schema) =>
                response._tag === "Success"
                  ? getTransferables(schema.output, response.value)
                  : getTransferables(schema.error, response.error),
              ),
              Option.getOrUndefined,
            )
            return port.postMessage([id, response], { transfer })
          }),
        ),
        Effect.catchAllDefect((error) =>
          Effect.sync(() =>
            port.postMessage([
              id,
              {
                _tag: "Error",
                error: {
                  _tag: "RpcTransportError",
                  error,
                },
              } satisfies RpcResponse,
            ]),
          ),
        ),
      ) as any
    }
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
      Effect.asyncInterrupt<never, never, never>(() => {
        const controller = new AbortController()
        const runFork = Runtime.runFork(runtime)

        function handlePort(port: MessagePort | typeof globalThis) {
          const portHandler = handler(port)

          port.addEventListener(
            "message",
            (event) => runFork(portHandler(event as MessageEvent) as any),
            { signal: controller.signal },
          )
        }

        if ("postMessage" in self) {
          handlePort(self)
        } else {
          // eslint-disable-next-line @typescript-eslint/no-extra-semi
          ;(self as any).addEventListener(
            "connect",
            (event: MessageEvent) => {
              const port = event.ports[0]
              handlePort(port)
              port.start()
            },
            { signal: controller.signal },
          )
        }

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
