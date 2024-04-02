/**
 * @since 1.0.0
 */
import type * as App from "@effect/platform/Http/App"
import type * as ServerError from "@effect/platform/Http/ServerError"
import * as ServerRequest from "@effect/platform/Http/ServerRequest"
import * as ServerResponse from "@effect/platform/Http/ServerResponse"
import * as Router from "@effect/rpc/Router"
import type { ParseError } from "@effect/schema/ParseResult"
import * as Effect from "effect/Effect"

/**
 * @since 1.0.0
 * @category conversions
 */
export const toHttpApp = <R extends Router.Router<any, any>>(self: R): App.Default<
  Router.Router.Context<R>,
  ServerError.RequestError | ParseError
> => {
  const handler = Router.toHandlerEffect(self)
  return ServerRequest.ServerRequest.pipe(
    Effect.flatMap((_) => _.json),
    Effect.flatMap(handler),
    Effect.map(ServerResponse.unsafeJson)
  )
}
