import * as Effect from "@effect/io/Effect"
import { getTransferables } from "@effect/rpc-webworkers/Schema"
import type { RpcWorkerHandler } from "@effect/rpc-webworkers/Server"
import type { RpcRouter } from "@effect/rpc/Router"
import * as Server from "@effect/rpc/Server"

/** @internal */
export const make = <Router extends RpcRouter.Base>(
  router: Router,
): RpcWorkerHandler<Router> => {
  const handler = Server.handleSingleWithSchema(router)
  return (message) =>
    Effect.flatMap(handler(message.data), ([response, schema]) =>
      Effect.sync(() => {
        const transfer = getTransferables(schema.output, response)
        return postMessage(response, { transfer })
      }),
    )
}
