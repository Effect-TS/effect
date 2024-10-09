/**
 * @since 1.0.0
 */
import type * as App from "@effect/platform/HttpApp"
import type * as ServerError from "@effect/platform/HttpServerError"
import * as ServerRequest from "@effect/platform/HttpServerRequest"
import * as ServerResponse from "@effect/platform/HttpServerResponse"
import * as Router from "@effect/rpc/RpcRouter"
import * as Chunk from "effect/Chunk"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as FiberRef from "effect/FiberRef"
import { dual } from "effect/Function"
import * as Stream from "effect/Stream"

/**
 * @since 1.0.0
 * @category conversions
 */
export const toHttpApp: {
  (options?: {
    readonly spanPrefix?: string
  }): <R extends Router.RpcRouter<any, any>>(self: R) => App.Default<
    ServerError.RequestError,
    Router.RpcRouter.Context<R>
  >
  <R extends Router.RpcRouter<any, any>>(self: R, options?: {
    readonly spanPrefix?: string
  }): App.Default<
    ServerError.RequestError,
    Router.RpcRouter.Context<R>
  >
} = dual((args) => Router.isRpcRouter(args[0]), <R extends Router.RpcRouter<any, any>>(self: R, options?: {
  readonly spanPrefix?: string
}): App.Default<
  ServerError.RequestError,
  Router.RpcRouter.Context<R>
> => {
  const handler = Router.toHandler(self, options)
  return Effect.withFiberRuntime((fiber) => {
    const context = fiber.getFiberRef(FiberRef.currentContext)
    const request = Context.unsafeGet(context, ServerRequest.HttpServerRequest)
    return Effect.map(request.json, (_) =>
      ServerResponse.stream(
        handler(_).pipe(
          Stream.chunks,
          Stream.map((_) => JSON.stringify(Chunk.toReadonlyArray(_)) + "\n"),
          Stream.encodeText,
          Stream.provideContext(context)
        ),
        { contentType: "application/ndjson" }
      ))
  })
})
