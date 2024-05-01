/**
 * @since 1.0.0
 */
import type * as Handler from "@effect/platform/Handler"
import type * as App from "@effect/platform/Http/App"
import type * as ServerError from "@effect/platform/Http/ServerError"
import * as ServerRequest from "@effect/platform/Http/ServerRequest"
import * as ServerResponse from "@effect/platform/Http/ServerResponse"
import * as Server from "@effect/rpc/Server"
import type { ParseError } from "@effect/schema/ParseResult"
import * as Effect from "effect/Effect"

/**
 * @since 1.0.0
 * @category conversions
 */
export const toHttpApp = <R extends Handler.Group.Any>(self: R): App.Default<
  ServerError.RequestError | ParseError,
  Handler.Group.Context<R>
> => {
  const handler = Server.fromGroupEffect(self)
  return ServerRequest.ServerRequest.pipe(
    Effect.flatMap((_) => _.json),
    Effect.flatMap(handler),
    Effect.map(ServerResponse.unsafeJson)
  )
}
