import * as Cause from "effect/Cause"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as FiberRef from "effect/FiberRef"
import { constFalse, dual } from "effect/Function"
import { globalValue } from "effect/GlobalValue"
import * as Option from "effect/Option"
import type * as Predicate from "effect/Predicate"
import * as Headers from "../../Http/Headers.js"
import type * as Middleware from "../../Http/Middleware.js"
import * as ServerError from "../../Http/ServerError.js"
import * as ServerRequest from "../../Http/ServerRequest.js"
import * as TraceContext from "../../Http/TraceContext.js"

/** @internal */
export const make = <M extends Middleware.Middleware>(middleware: M): M => middleware

/** @internal */
export const loggerDisabled = globalValue(
  Symbol.for("@effect/platform/Http/Middleware/loggerDisabled"),
  () => FiberRef.unsafeMake(false)
)

/** @internal */
export const withLoggerDisabled = <R, E, A>(self: Effect.Effect<A, E, R>): Effect.Effect<A, E, R> =>
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
  ) => <R, E, A>(effect: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R>,
  <R, E, A>(
    effect: Effect.Effect<A, E, R>,
    predicate: Predicate.Predicate<ServerRequest.ServerRequest>
  ) => Effect.Effect<A, E, R>
>(2, (self, pred) => Effect.locally(self, currentTracerDisabledWhen, pred))

/** @internal */
export const logger = make((httpApp) => {
  let counter = 0
  return Effect.withFiberRuntime((fiber) => {
    const context = fiber.getFiberRef(FiberRef.currentContext)
    const request = Context.unsafeGet(context, ServerRequest.ServerRequest)
    return Effect.withLogSpan(
      Effect.onExit(httpApp, (exit) => {
        if (fiber.getFiberRef(loggerDisabled)) {
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
          Effect.annotateLogs(Effect.log("Sent HTTP response"), {
            "http.method": request.method,
            "http.url": request.url,
            "http.status": exit.value.status
          })
      }),
      `http.span.${++counter}`
    )
  })
})

/** @internal */
export const tracer = make((httpApp) => {
  const appWithStatus = Effect.tap(
    httpApp,
    (response) => Effect.annotateCurrentSpan("http.status", response.status)
  )
  return Effect.withFiberRuntime((fiber) => {
    const context = fiber.getFiberRef(FiberRef.currentContext)
    const request = Context.unsafeGet(context, ServerRequest.ServerRequest)
    const disabled = fiber.getFiberRef(currentTracerDisabledWhen)(request)
    if (disabled) {
      return httpApp
    }
    return Effect.withSpan(
      appWithStatus,
      `http.server ${request.method}`,
      {
        attributes: { "http.method": request.method, "http.url": request.url },
        parent: Option.getOrUndefined(TraceContext.fromHeaders(request.headers))
      }
    )
  })
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
