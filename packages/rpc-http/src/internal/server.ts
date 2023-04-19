import { Tag } from "@effect/data/Context"
import * as Effect from "@effect/io/Effect"
import type * as server from "@effect/rpc-http/Server"
import type { RpcRouter } from "@effect/rpc/Server"
import * as Server from "@effect/rpc/Server"

/** @internal */
export const HttpRequest = Tag<server.HttpRequest>()

/** @internal */
export function make<R extends RpcRouter.Base>(
  router: R,
): server.RpcHttpHandler<R> {
  const handler = Server.handler(router)
  return (request) =>
    Effect.provideService(handler(request.body), HttpRequest, request) as any
}
