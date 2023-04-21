/**
 * @since 1.0.0
 */
import { pipe } from "@effect/data/Function"
import * as Effect from "@effect/io/Effect"
import type { Span } from "@effect/io/Tracer"
import type { HttpRequest } from "@effect/rpc-http/Server"
import * as Server from "@effect/rpc-http/Server"
import type { RpcHandlers, RpcRouter } from "@effect/rpc/Router"
import type { IncomingMessage, ServerResponse } from "node:http"
import type { Readable } from "node:stream"

export {
  /**
   * @category tags
   * @since 1.0.0
   */
  HttpRequest,
} from "@effect/rpc-http/Server"

/**
 * @category models
 * @since 1.0.0
 */
export interface RpcNodeHttpHandler<R extends RpcRouter.Base> {
  (request: IncomingMessage, response: ServerResponse): Effect.Effect<
    Exclude<RpcHandlers.Services<R["handlers"]>, HttpRequest | Span>,
    never,
    void
  >
}

/**
 * @category constructors
 * @since 1.0.0
 */
export function make<R extends RpcRouter.Base>(
  router: R,
): RpcNodeHttpHandler<R> {
  const handler = Server.make(router)

  return function handleRequestResponse(
    request: IncomingMessage,
    response: ServerResponse,
  ) {
    return pipe(
      bodyToString(request),
      Effect.flatMap(parseJson),
      Effect.flatMap((body) =>
        handler({
          url: request.url!,
          headers: new Headers(request.headers as any),
          body,
        }),
      ),
      Effect.tap((responses) =>
        Effect.sync(() => {
          response.writeHead(200, {
            "Content-Type": "application/json; charset=utf-8",
          })
          response.end(JSON.stringify(responses))
        }),
      ),
      Effect.catchAllCause((cause) =>
        Effect.flatMap(Effect.logErrorCause(cause), () =>
          Effect.sync(() => {
            response.writeHead(500)
            response.end()
          }),
        ),
      ),
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
  Effect.tryCatch(
    () => JSON.parse(body) as unknown,
    (error) => new Error(`Failed to parse JSON: ${error}`),
  )
