import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as FiberRef from "effect/FiberRef"
import { constFalse, dual } from "effect/Function"
import { globalValue } from "effect/GlobalValue"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import type * as Predicate from "effect/Predicate"
import * as Headers from "../Headers.js"
import type * as App from "../HttpApp.js"
import type * as Middleware from "../HttpMiddleware.js"
import * as ServerError from "../HttpServerError.js"
import * as ServerRequest from "../HttpServerRequest.js"
import type { HttpServerResponse } from "../HttpServerResponse.js"
import * as TraceContext from "../HttpTraceContext.js"

/** @internal */
export const make = <M extends Middleware.HttpMiddleware>(middleware: M): M => middleware

/** @internal */
export const loggerDisabled = globalValue(
  Symbol.for("@effect/platform/HttpMiddleware/loggerDisabled"),
  () => FiberRef.unsafeMake(false)
)

/** @internal */
export const withLoggerDisabled = <A, E, R>(self: Effect.Effect<A, E, R>): Effect.Effect<A, E, R> =>
  Effect.zipRight(
    FiberRef.set(loggerDisabled, true),
    self
  )

/** @internal */
export const currentTracerDisabledWhen = globalValue(
  Symbol.for("@effect/platform/HttpMiddleware/tracerDisabledWhen"),
  () => FiberRef.unsafeMake<Predicate.Predicate<ServerRequest.HttpServerRequest>>(constFalse)
)

/** @internal */
export const withTracerDisabledWhen = dual<
  (
    predicate: Predicate.Predicate<ServerRequest.HttpServerRequest>
  ) => <A, E, R>(layer: Layer.Layer<A, E, R>) => Layer.Layer<A, E, R>,
  <A, E, R>(
    layer: Layer.Layer<A, E, R>,
    predicate: Predicate.Predicate<ServerRequest.HttpServerRequest>
  ) => Layer.Layer<A, E, R>
>(2, (self, pred) => Layer.locally(self, currentTracerDisabledWhen, pred))

/** @internal */
export const withTracerDisabledWhenEffect = dual<
  (
    predicate: Predicate.Predicate<ServerRequest.HttpServerRequest>
  ) => <A, E, R>(effect: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R>,
  <A, E, R>(
    effect: Effect.Effect<A, E, R>,
    predicate: Predicate.Predicate<ServerRequest.HttpServerRequest>
  ) => Effect.Effect<A, E, R>
>(2, (self, pred) => Effect.locally(self, currentTracerDisabledWhen, pred))

/** @internal */
export const withTracerDisabledForUrls = dual<
  (
    urls: ReadonlyArray<string>
  ) => <A, E, R>(layer: Layer.Layer<A, E, R>) => Layer.Layer<A, E, R>,
  <A, E, R>(
    layer: Layer.Layer<A, E, R>,
    urls: ReadonlyArray<string>
  ) => Layer.Layer<A, E, R>
>(2, (self, urls) => Layer.locally(self, currentTracerDisabledWhen, (req) => urls.includes(req.url)))

/** @internal */
export const logger = make((httpApp) => {
  let counter = 0
  return Effect.withFiberRuntime((fiber) => {
    const context = fiber.getFiberRef(FiberRef.currentContext)
    const request = Context.unsafeGet(context, ServerRequest.HttpServerRequest)
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
    const request = Context.unsafeGet(context, ServerRequest.HttpServerRequest)
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
      {
        parent: Option.getOrUndefined(TraceContext.fromHeaders(request.headers)),
        kind: "server",
        captureStackTrace: false
      },
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
  Effect.updateService(httpApp, ServerRequest.HttpServerRequest, (request) =>
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

/** @internal */
export const searchParamsParser = <E, R>(httpApp: App.Default<E, R>) =>
  Effect.withFiberRuntime<
    HttpServerResponse,
    E,
    ServerRequest.HttpServerRequest | Exclude<R, ServerRequest.ParsedSearchParams>
  >((fiber) => {
    const context = fiber.getFiberRef(FiberRef.currentContext)
    const request = Context.unsafeGet(context, ServerRequest.HttpServerRequest)
    const params = ServerRequest.searchParamsFromURL(new URL(request.url))
    return Effect.locally(
      httpApp,
      FiberRef.currentContext,
      Context.add(context, ServerRequest.ParsedSearchParams, params)
    ) as any
  })
