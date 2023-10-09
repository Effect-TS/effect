import { RpcTransportError } from "@effect/rpc/Error"
import type { RpcRequest, RpcResponse } from "@effect/rpc/Resolver"
import type { RpcRouter } from "@effect/rpc/Router"
import * as Server from "@effect/rpc/Server"
import * as Cause from "effect/Cause"
import * as Effect from "effect/Effect"
import { pipe } from "effect/Function"
import * as Option from "effect/Option"
import * as Runtime from "effect/Runtime"
import type { Scope } from "effect/Scope"
import { getTransferables } from "../Schema"
import type { RpcWorker, RpcWorkerHandler } from "../Server"

/** @internal */
export const makeHandler: {
  <R extends RpcRouter.WithSetup>(
    router: R
  ): Effect.Effect<
    Scope,
    never,
    (port: MessagePort | typeof globalThis) => RpcWorkerHandler<R>
  >
  <R extends RpcRouter.WithoutSetup>(
    router: R
  ): (port: MessagePort | typeof globalThis) => RpcWorkerHandler<R>
} = (router: RpcRouter.Base) => {
  const handler = Server.handleSingleWithSchema(router) as unknown

  const run = (handler: Server.RpcServerSingleWithSchema) =>
  (
    port: MessagePort | typeof globalThis
  ): RpcWorkerHandler<RpcRouter.Base> => {
    return (message) => {
      const [id, request] = message.data as [number, RpcRequest.Payload]
      return pipe(
        handler(request),
        Effect.flatMap(([response, schema]) =>
          Effect.sync(() => {
            const transfer = pipe(
              Option.map(schema, (schema) =>
                response._tag === "Success"
                  ? schema.output ? getTransferables(schema.output, response.value) : []
                  : getTransferables(schema.error, response.error)),
              Option.getOrUndefined
            )
            return port.postMessage([id, response], { transfer })
          })
        ),
        Effect.catchAllCause((cause) =>
          Effect.sync(() =>
            port.postMessage([
              id,
              {
                _tag: "Error",
                error: RpcTransportError({ error: JSON.stringify(Cause.squash(cause)) })
              } satisfies RpcResponse
            ])
          )
        )
      ) as any
    }
  }

  if (Effect.isEffect(handler)) {
    return Effect.map(handler as any, run)
  }

  return run(handler as any) as any
}

/** @internal */
export const make = <Router extends RpcRouter.Base>(
  router: Router
): RpcWorker<Router> => {
  const handler = makeHandler(router)

  const run = (
    handler: (
      port: MessagePort | typeof globalThis
    ) => RpcWorkerHandler<RpcRouter.Base>
  ) =>
    pipe(
      Effect.runtime<any>(),
      Effect.flatMap((runtime) =>
        Effect.async<never, never, void>((resume) => {
          const runFork = Runtime.runFork(runtime)
          let portCount = 0

          function handlePort(port: MessagePort | typeof globalThis) {
            const portHandler = handler(port)
            portCount++

            port.addEventListener("message", (event) => {
              if ((event as MessageEvent).data === "close") {
                portCount--
                if (portCount === 0) {
                  resume(Effect.unit)
                }
              } else {
                runFork(portHandler(event as MessageEvent) as any)
              }
            })
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
              }
            )
          }

          self.addEventListener("unhandledrejection", (event) => {
            throw event.reason
          })
        })
      )
    ) as any

  if (Effect.isEffect(handler)) {
    return Effect.scoped(Effect.flatMap(handler as any, run)) as any
  }

  return run(handler as any)
}
