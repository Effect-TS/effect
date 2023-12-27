/**
 * @since 1.0.0
 */
import type { RpcHandlers, RpcRouter } from "@effect/rpc/Router"
import type { RpcServer } from "@effect/rpc/Server"
import * as Server from "@effect/rpc/Server"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import { pipe } from "effect/Function"
import type * as Http from "node:http"
import type { Readable } from "node:stream"

/**
 * @category tags
 * @since 1.0.0
 */
export const IncomingMessage = Context.Tag<Http.IncomingMessage>("@effect/rpc-http-node/IncomingMessage")

/**
 * @category models
 * @since 1.0.0
 */
export interface RpcNodeHttpHandler<R extends RpcRouter.Base> {
  (
    request: Http.IncomingMessage,
    response: Http.ServerResponse
  ): Effect.Effect<
    Exclude<RpcHandlers.Services<R["handlers"]>, Http.IncomingMessage>,
    never,
    void
  >
}

/**
 * @category constructors
 * @since 1.0.0
 */
export function make<R extends RpcRouter.Base>(
  router: R
): RpcNodeHttpHandler<R> {
  const handler = Server.handler(router) as unknown as RpcServer

  return function handleRequestResponse(
    request: Http.IncomingMessage,
    response: Http.ServerResponse
  ) {
    return pipe(
      bodyToString(request),
      Effect.flatMap(parseJson),
      Effect.flatMap((body) =>
        Effect.provideService(
          handler(body),
          IncomingMessage,
          request
        )
      ),
      Effect.tap((responses) =>
        Effect.sync(() => {
          response.writeHead(200, {
            "Content-Type": "application/json; charset=utf-8"
          })
          response.end(JSON.stringify(responses))
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

const bodyToString = (stream: Readable) =>
  Effect.async<never, Error, string>((resume) => {
    let data = ""
    stream.setEncoding("utf8")
    stream.on("data", (chunk) => {
      data += chunk
    })
    stream.once("end", () => {
      resume(Effect.succeed(data))
    })
    stream.once("error", (error) => {
      resume(Effect.fail(error))
    })
  })

const parseJson = (body: string) =>
  Effect.try({
    try: () => JSON.parse(body) as unknown,
    catch: (error) => new Error(`Failed to parse JSON: ${error}`)
  })
