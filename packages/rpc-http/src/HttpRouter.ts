/**
 * @since 1.0.0
 */
import * as MsgPack from "@effect/experimental/MsgPack"
import type * as App from "@effect/platform/Http/App"
import type * as ServerError from "@effect/platform/Http/ServerError"
import * as ServerRequest from "@effect/platform/Http/ServerRequest"
import * as ServerResponse from "@effect/platform/Http/ServerResponse"
import * as Router from "@effect/rpc/Router"
import * as Effect from "effect/Effect"
import * as Stream from "effect/Stream"

/**
 * @since 1.0.0
 * @category conversions
 */
export const toHttpApp = <R extends Router.Router<any, any>>(self: R): App.Default<
  Router.Router.Context<R>,
  ServerError.RequestError
> => {
  const handler = Router.toHandler(self)
  return Effect.map(
    Effect.flatMap(
      ServerRequest.ServerRequest,
      (request) => request.json
    ),
    (_) =>
      ServerResponse.stream(
        Stream.pipeThroughChannel(
          handler(_),
          MsgPack.pack()
        )
      )
  )
}
