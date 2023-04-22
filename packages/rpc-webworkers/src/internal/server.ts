import * as Effect from "@effect/io/Effect"
import { pipe } from "@effect/data/Function"
import * as Option from "@effect/data/Option"
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
        const transfer = pipe(
          Option.map(schema, (schema) =>
            response._tag === "Success"
              ? getTransferables(schema.output, response.value)
              : getTransferables(schema.error, response.error),
          ),
          Option.getOrUndefined,
        )
        return self.postMessage(response, { transfer })
      }),
    )
}
