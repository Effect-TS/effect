/**
 * @since 1.0.0
 */
import type { HttpRequest } from "@effect/rpc-http/Server"
import * as Server from "@effect/rpc-http/Server"
import type { RpcHandlers, RpcRouter } from "@effect/rpc/Router"
import * as Effect from "effect/Effect"
import { pipe } from "effect/Function"
import type { Span } from "effect/Tracer"
import type { NextApiRequest, NextApiResponse } from "next"

export {
  /**
   * @category tags
   * @since 1.0.0
   */
  HttpRequest
} from "@effect/rpc-http/Server"

/**
 * @category models
 * @since 1.0.0
 */
export interface RpcNextjsHandler<R extends RpcRouter.Base> {
  (
    request: NextApiRequest,
    response: NextApiResponse
  ): Effect.Effect<
    Exclude<RpcHandlers.Services<R["handlers"]>, HttpRequest | Span>,
    never,
    void
  >
}

/**
 * @category constructors
 * @since 1.0.0
 */
export function make<R extends RpcRouter.Base>(router: R): RpcNextjsHandler<R> {
  const handler = Server.make(router)

  return function handleRequestResponse(
    request: NextApiRequest,
    response: NextApiResponse
  ) {
    return pipe(
      handler({
        url: request.url!,
        headers: new Headers(request.headers as any),
        body: request.body
      }),
      Effect.tap((responses) =>
        Effect.sync(() => {
          response.json(responses)
        })
      ),
      Effect.catchAllCause((cause) =>
        Effect.flatMap(Effect.logError(cause), () =>
          Effect.sync(() => {
            response.writeHead(500)
            response.end()
          }))
      )
    )
  } as any
}
