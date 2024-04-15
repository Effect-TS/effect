/**
 * @since 1.0.0
 */
import type * as App from "@effect/platform/Http/App"
import type * as ServerError from "@effect/platform/Http/ServerError"
import * as ServerRequest from "@effect/platform/Http/ServerRequest"
import * as ServerResponse from "@effect/platform/Http/ServerResponse"
import * as Router from "@effect/rpc/Router"
import * as Chunk from "effect/Chunk"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as FiberRef from "effect/FiberRef"
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
  return Effect.withFiberRuntime((fiber) => {
    const context = fiber.getFiberRef(FiberRef.currentContext)
    const request = Context.unsafeGet(context, ServerRequest.ServerRequest)
    return Effect.map(request.json, (_) =>
      ServerResponse.stream(
        handler(_).pipe(
          Stream.chunks,
          Stream.map((_) => JSON.stringify(Chunk.toArray(_))),
          Stream.intersperse("\n"),
          Stream.encodeText,
          Stream.provideContext(context)
        ),
        { contentType: "application/ndjson" }
      ))
  })
}
