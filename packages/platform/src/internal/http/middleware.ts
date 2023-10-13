import * as Effect from "effect/Effect"
import * as Headers from "../../Http/Headers"
import * as IncomingMessage from "../../Http/IncomingMessage"
import type * as Middleware from "../../Http/Middleware"
import * as ServerRequest from "../../Http/ServerRequest"

/** @internal */
export const make = <M extends Middleware.Middleware>(middleware: M): M => middleware

/** @internal */
export const logger = make((httpApp) => {
  let counter = 0
  return Effect.flatMap(
    ServerRequest.ServerRequest,
    (request) =>
      Effect.withLogSpan(
        Effect.onExit(httpApp, (exit) =>
          exit._tag === "Failure" ?
            Effect.annotateLogs(Effect.log(exit.cause), {
              "http.method": request.method,
              "http.url": request.url,
              "http.status": 500
            }) :
            Effect.annotateLogs(Effect.log(""), {
              "http.method": request.method,
              "http.url": request.url,
              "http.status": exit.value.status
            })),
        `http.span.${++counter}`
      )
  )
})

/** @internal */
export const tracer = make((httpApp) => {
  const appWithStatus = Effect.tap(
    httpApp,
    (response) => Effect.annotateCurrentSpan("http.status", response.status)
  )
  return Effect.flatMap(
    ServerRequest.ServerRequest,
    (request) =>
      Effect.flatMap(
        request.headers["x-b3-traceid"] || request.headers["b3"] ?
          Effect.orElseSucceed(IncomingMessage.schemaExternalSpan(request), () => undefined) :
          Effect.succeed(undefined),
        (parent) =>
          Effect.withSpan(
            appWithStatus,
            `http ${request.method}`,
            { attributes: { "http.method": request.method, "http.url": request.url }, parent }
          )
      )
  )
})

/** @internal */
export const xForwardedHeaders = make((httpApp) =>
  Effect.updateService(httpApp, ServerRequest.ServerRequest, (request) =>
    request.headers["x-forwarded-host"]
      ? request.modify({
        headers: Headers.set(
          request.headers,
          "host",
          request.headers["x-forwarded-host"]
        ),
        remoteAddress: request.headers["x-forwarded-for"]?.split(",")[0].trim()
      })
      : request)
)
