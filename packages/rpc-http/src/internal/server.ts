import type * as App from "@effect/platform/Http/App"
import type * as ServerError from "@effect/platform/Http/ServerError"
import * as ServerRequest from "@effect/platform/Http/ServerRequest"
import * as ServerResponse from "@effect/platform/Http/ServerResponse"
import type { RpcRouter } from "@effect/rpc/Router"
import * as Server from "@effect/rpc/Server"
import * as Effect from "effect/Effect"

/** @internal */
export function make<R extends RpcRouter.Base>(
  router: R
): App.Default<RpcRouter.Services<R>, RpcRouter.Errors<R> | ServerError.RequestError> {
  const handler = Server.handler(router)
  const handlerJson = (u: unknown) =>
    Effect.map(
      handler(u),
      (_) => ServerResponse.unsafeJson(_)
    )
  return Effect.flatMap(
    Effect.flatMap(
      ServerRequest.ServerRequest,
      (request) => request.json
    ),
    handlerJson
  ) as any
}
