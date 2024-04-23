import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as FiberRef from "effect/FiberRef"
import { constFalse, dual } from "effect/Function"
import { globalValue } from "effect/GlobalValue"
import * as Layer from "effect/Layer"
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
  ) => <R, E, A>(layer: Layer.Layer<A, E, R>) => Layer.Layer<A, E, R>,
  <R, E, A>(
    layer: Layer.Layer<A, E, R>,
    predicate: Predicate.Predicate<ServerRequest.ServerRequest>
  ) => Layer.Layer<A, E, R>
>(2, (self, pred) => Layer.locally(self, currentTracerDisabledWhen, pred))

/** @internal */
export const withTracerDisabledWhenEffect = dual<
  (
    predicate: Predicate.Predicate<ServerRequest.ServerRequest>
  ) => <R, E, A>(effect: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R>,
  <R, E, A>(
    effect: Effect.Effect<A, E, R>,
    predicate: Predicate.Predicate<ServerRequest.ServerRequest>
  ) => Effect.Effect<A, E, R>
>(2, (self, pred) => Effect.locally(self, currentTracerDisabledWhen, pred))

/** @internal */
export const withTracerDisabledForUrls = dual<
  (
    urls: ReadonlyArray<string>
  ) => <R, E, A>(layer: Layer.Layer<A, E, R>) => Layer.Layer<A, E, R>,
  <R, E, A>(
    layer: Layer.Layer<A, E, R>,
    urls: ReadonlyArray<string>
  ) => Layer.Layer<A, E, R>
>(2, (self, urls) => Layer.locally(self, currentTracerDisabledWhen, (req) => urls.includes(req.url)))

/** @internal */
export const logger = make((httpApp) => {
  let counter = 0
  return Effect.withFiberRuntime((fiber) => {
    const context = fiber.getFiberRef(FiberRef.currentContext)
    const request = Context.unsafeGet(context, ServerRequest.ServerRequest)
    return Effect.withLogSpan(
      Effect.flatMap(Effect.exit(httpApp), (exit) => {
        if (fiber.getFiberRef(loggerDisabled)) {
          return exit
        }
        return Effect.zipRight(
          exit._tag === "Failure" ?
            Effect.annotateLogs(Effect.log(exit.cause), {
              "http.method": request.method,
              "http.url": request.url,
              "http.status": ServerError.causeStatusCode(exit.cause)
            }) :
            Effect.annotateLogs(Effect.log("Sent HTTP response"), {
              "http.method": request.method,
              "http.url": request.url,
              "http.status": exit.value.status
            }),
          exit
        )
      }),
      `http.span.${++counter}`
    )
  })
})

/** @internal */
export const tracer = make((httpApp) =>
  Effect.withFiberRuntime((fiber) => {
    const context = fiber.getFiberRef(FiberRef.currentContext)
    const request = Context.unsafeGet(context, ServerRequest.ServerRequest)
    const disabled = fiber.getFiberRef(currentTracerDisabledWhen)(request)
    if (disabled) {
      return httpApp
    }
    const host = request.headers["host"] ?? "localhost"
    const protocol = request.headers["x-forwarded-proto"] === "https" ? "https" : "http"
    let url: URL | undefined = undefined
    try {
      url = new URL(request.url, `${protocol}://${host}`)
      if (url.username !== "" || url.password !== "") {
        url.username = "REDACTED"
        url.password = "REDACTED"
      }
    } catch (_) {
      //
    }
    const redactedHeaderNames = fiber.getFiberRef(Headers.currentRedactedNames)
    const redactedHeaders = Headers.redact(request.headers, redactedHeaderNames)
    return Effect.useSpan(
      `http.server ${request.method}`,
      { parent: Option.getOrUndefined(TraceContext.fromHeaders(request.headers)), kind: "server" },
      (span) => {
        span.attribute("http.request.method", request.method)
        if (url !== undefined) {
          span.attribute("url.full", url.toString())
          span.attribute("url.path", url.pathname)
          const query = url.search.slice(1)
          if (query !== "") {
            span.attribute("url.query", url.search.slice(1))
          }
          span.attribute("url.scheme", url.protocol.slice(0, -1))
        }
        if (request.headers["user-agent"] !== undefined) {
          span.attribute("user_agent.original", request.headers["user-agent"])
        }
        for (const name in redactedHeaders) {
          span.attribute(`http.request.header.${name}`, String(redactedHeaders[name]))
        }
        if (request.remoteAddress._tag === "Some") {
          span.attribute("client.address", request.remoteAddress.value)
        }
        return Effect.flatMap(
          Effect.exit(Effect.withParentSpan(httpApp, span)),
          (exit) => {
            if (exit._tag === "Failure") {
              span.attribute("http.response.status_code", ServerError.causeStatusCode(exit.cause))
            } else {
              const response = exit.value
              span.attribute("http.response.status_code", response.status)
              const redactedHeaders = Headers.redact(response.headers, redactedHeaderNames)
              for (const name in redactedHeaders) {
                span.attribute(`http.response.header.${name}`, String(redactedHeaders[name]))
              }
            }
            return exit
          }
        )
      }
    )
  })
)

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
