/**
 * @since 1.0.0
 */
import type * as App from "@effect/platform/HttpApp"
import type * as ServerError from "@effect/platform/HttpServerError"
import * as ServerRequest from "@effect/platform/HttpServerRequest"
import * as ServerResponse from "@effect/platform/HttpServerResponse"
import * as Router from "@effect/rpc/RpcRouter"
import type { ParseError } from "@effect/schema/ParseResult"
import * as Effect from "effect/Effect"

/**
 * @since 1.0.0
 * @category conversions
 */
export const toHttpApp = <R extends Router.RpcRouter<any, any>>(self: R, options?: {
  readonly spanPrefix?: string
}): App.Default<
  ServerError.RequestError | ParseError,
  Router.RpcRouter.Context<R>
> => {
  const handler = Router.toHandlerNoStream(self, options)
  return ServerRequest.HttpServerRequest.pipe(
    Effect.flatMap((_) => _.json),
    Effect.flatMap(handler),
    Effect.map(ServerResponse.unsafeJson)
  )
}
