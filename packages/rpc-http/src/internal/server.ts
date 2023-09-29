import type * as server from "@effect/rpc-http/Server"
import type { RpcRouter } from "@effect/rpc/Router"
import * as Server from "@effect/rpc/Server"
import { Tag } from "effect/Context"
import * as Effect from "effect/Effect"

/** @internal */
export const HttpRequest = Tag<server.HttpRequest>()

/** @internal */
export function make<R extends RpcRouter.Base>(
  router: R
): server.RpcHttpHandler<R> {
  const handler = Server.handler(router)
  return (request) => Effect.provideService(handler(request.body), HttpRequest, request) as any
}
