import type * as Error from "@effect/platform/WorkerError"
import * as Runner from "@effect/platform/WorkerRunner"
import type { RpcTransportError } from "@effect/rpc/Error"
import type { RpcRequest, RpcResponse } from "@effect/rpc/Resolver"
import type { RpcRouter } from "@effect/rpc/Router"
import type * as Schema from "@effect/rpc/Schema"
import * as Server from "@effect/rpc/Server"
import * as Effect from "effect/Effect"
import * as Option from "effect/Option"
import type * as Scope from "effect/Scope"
import { getTransferables } from "../Schema.js"

/** @internal */
export const make = <R extends RpcRouter.Base>(router: R): Effect.Effect<
  Scope.Scope | Runner.PlatformRunner | RpcRouter.Services<R>,
  Error.WorkerError,
  void
> => {
  const run = (handler: Server.RpcServerSingleWithSchema) =>
    Runner.make<
      RpcRequest.Payload,
      never,
      RpcTransportError,
      readonly [RpcResponse, Option.Option<Schema.RpcSchema.Base>]
    >(handler, {
      encodeOutput(_request, [response]) {
        return Effect.succeed(response)
      },
      transfers(message) {
        if ("_tag" in message) {
          return []
        }
        const [response, schema] = message
        return Option.getOrElse(
          Option.map(schema, (schema) =>
            response._tag === "Success"
              ? schema.output ? getTransferables(schema.output, response.value) : []
              : getTransferables(schema.error, response.error)),
          () => []
        )
      }
    })

  const handler = Server.handleSingleWithSchema(router) as unknown
  return Effect.isEffect(handler) ?
    Effect.flatMap(handler as Effect.Effect<never, never, Server.RpcServerSingleWithSchema>, run)
    : run(handler as any)
}
