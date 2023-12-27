import * as Cause from "effect/Cause"
import * as Effect from "effect/Effect"
import * as FiberRef from "effect/FiberRef"
import { constFalse, dual } from "effect/Function"
import { globalValue } from "effect/GlobalValue"
import type * as Predicate from "effect/Predicate"
import * as Headers from "../../Http/Headers.js"
import * as IncomingMessage from "../../Http/IncomingMessage.js"
import type * as Middleware from "../../Http/Middleware.js"
import * as ServerError from "../../Http/ServerError.js"
import * as ServerRequest from "../../Http/ServerRequest.js"

/** @internal */
export const make = <M extends Middleware.Middleware>(middleware: M): M => middleware

/** @internal */
export const loggerDisabled = globalValue(
  Symbol.for("@effect/platform/Http/Middleware/loggerDisabled"),
  () => FiberRef.unsafeMake(false)
)

/** @internal */
export const withLoggerDisabled = <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R, E, A> =>
  Effect.zipRight(
    FiberRef.set(loggerDisabled, true),
    self
  )

/** @internal */
export const currentTracerDisabledWhen = globalValue(
  Symbol.for("@effect/platform/Http/Middleware/tracerDisabledWhen"),
  () => FiberRef.unsafeMake<Predicate.Predicate<ServerRequest.ServerRequest>>(constFalse)
)

/** @internal */
export const withTracerDisabledWhen = dual<
  (
    predicate: Predicate.Predicate<ServerRequest.ServerRequest>
  ) => <R, E, A>(effect: Effect.Effect<R, E, A>) => Effect.Effect<R, E, A>,
  <R, E, A>(
    effect: Effect.Effect<R, E, A>,
    predicate: Predicate.Predicate<ServerRequest.ServerRequest>
  ) => Effect.Effect<R, E, A>
>(2, (self, pred) => Effect.locally(self, currentTracerDisabledWhen, pred))

/** @internal */
export const logger = make((httpApp) => {
  let counter = 0
  return Effect.flatMap(
    ServerRequest.ServerRequest,
    (request) =>
      Effect.withLogSpan(
        Effect.onExit(httpApp, (exit) =>
          Effect.flatMap(
            FiberRef.get(loggerDisabled),
            (disabled) => {
              if (disabled) {
                return Effect.unit
              }
              return exit._tag === "Failure" ?
                Effect.annotateLogs(Effect.log(exit.cause), {
                  "http.method": request.method,
                  "http.url": request.url,
                  "http.status": Cause.isInterruptedOnly(exit.cause)
                    ? ServerError.isClientAbortCause(exit.cause)
                      ? 499
                      : 503
                    : 500
                }) :
                Effect.annotateLogs(Effect.log(""), {
                  "http.method": request.method,
                  "http.url": request.url,
                  "http.status": exit.value.status
                })
            }
          )),
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
    Effect.zip(ServerRequest.ServerRequest, FiberRef.get(currentTracerDisabledWhen)),
    ([request, disabledWhen]) =>
      Effect.flatMap(
        request.headers["x-b3-traceid"] || request.headers["b3"] ?
          Effect.orElseSucceed(IncomingMessage.schemaExternalSpan(request), () => undefined) :
          Effect.succeed(undefined),
        (parent) =>
          disabledWhen(request) ?
            httpApp :
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
