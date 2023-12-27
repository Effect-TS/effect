/**
 * @since 1.0.0
 */
import type { RpcHandlers, RpcRouter } from "@effect/rpc/Router"
import * as Server from "@effect/rpc/Server"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import { pipe } from "effect/Function"
import type { NextApiRequest, NextApiResponse } from "next"

/**
 * @category tags
 * @since 1.0.0
 */
export const ApiRequest = Context.Tag<NextApiRequest>("@effect/rpc-nextjs/ApiRequest")

/**
 * @category models
 * @since 1.0.0
 */
export interface RpcNextjsHandler<R extends RpcRouter.Base> {
  (
    request: NextApiRequest,
    response: NextApiResponse
  ): Effect.Effect<
    Exclude<RpcHandlers.Services<R["handlers"]>, NextApiRequest>,
    never,
    void
  >
}

/**
 * @category constructors
 * @since 1.0.0
 */
export function make<R extends RpcRouter.Base>(router: R): RpcNextjsHandler<R> {
  const handler = Server.handler(router)

  return function handleRequestResponse(
    request: NextApiRequest,
    response: NextApiResponse
  ) {
    return pipe(
      handler(request.body),
      Effect.provideService(ApiRequest, request),
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
  }
}
