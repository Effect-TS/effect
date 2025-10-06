import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as FiberRef from "effect/FiberRef"
import { constFalse, dual } from "effect/Function"
import * as Function from "effect/Function"
import { globalValue } from "effect/GlobalValue"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import type * as Predicate from "effect/Predicate"
import type { ReadonlyRecord } from "effect/Record"
import * as Headers from "../Headers.js"
import type * as App from "../HttpApp.js"
import type * as Middleware from "../HttpMiddleware.js"
import * as ServerError from "../HttpServerError.js"
import * as ServerRequest from "../HttpServerRequest.js"
import * as ServerResponse from "../HttpServerResponse.js"
import type { HttpServerResponse } from "../HttpServerResponse.js"
import * as TraceContext from "../HttpTraceContext.js"
import * as internalHttpApp from "./httpApp.js"

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
export const SpanNameGenerator = Context.Reference<Middleware.SpanNameGenerator>()(
  "@effect/platform/HttpMiddleware/SpanNameGenerator",
  {
    defaultValue: () => (request: ServerRequest.HttpServerRequest) => `http.server ${request.method}`
  }
)

/** @internal */
export const withSpanNameGenerator = dual<
  (
    f: (request: ServerRequest.HttpServerRequest) => string
  ) => <A, E, R>(layer: Layer.Layer<A, E, R>) => Layer.Layer<A, E, R>,
  <A, E, R>(
    layer: Layer.Layer<A, E, R>,
    f: (request: ServerRequest.HttpServerRequest) => string
  ) => Layer.Layer<A, E, R>
>(2, (self, f) => Layer.provide(self, Layer.succeed(SpanNameGenerator, f)))

/** @internal */
export const logger = make((httpApp) => {
  let counter = 0
  return Effect.withFiberRuntime((fiber) => {
    const request = Context.unsafeGet(fiber.currentContext, ServerRequest.HttpServerRequest)
    return Effect.withLogSpan(
      Effect.flatMap(Effect.exit(httpApp), (exit) => {
        if (fiber.getFiberRef(loggerDisabled)) {
          return exit
        } else if (exit._tag === "Failure") {
          const [response, cause] = ServerError.causeResponseStripped(exit.cause)
          return Effect.zipRight(
            Effect.annotateLogs(Effect.log(cause._tag === "Some" ? cause.value : "Sent HTTP Response"), {
              "http.method": request.method,
              "http.url": request.url,
              "http.status": response.status
            }),
            exit
          )
        }
        return Effect.zipRight(
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
    const request = Context.unsafeGet(fiber.currentContext, ServerRequest.HttpServerRequest)
    const disabled = fiber.getFiberRef(currentTracerDisabledWhen)(request)
    if (disabled) {
      return httpApp
    }
    const url = Option.getOrUndefined(ServerRequest.toURL(request))
    if (url !== undefined && (url.username !== "" || url.password !== "")) {
      url.username = "REDACTED"
      url.password = "REDACTED"
    }
    const redactedHeaderNames = fiber.getFiberRef(Headers.currentRedactedNames)
    const redactedHeaders = Headers.redact(request.headers, redactedHeaderNames)
    const nameGenerator = Context.get(fiber.currentContext, SpanNameGenerator)
    return Effect.useSpan(
      nameGenerator(request),
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
            const response = ServerError.exitResponse(exit)
            span.attribute("http.response.status_code", response.status)
            const redactedHeaders = Headers.redact(response.headers, redactedHeaderNames)
            for (const name in redactedHeaders) {
              span.attribute(`http.response.header.${name}`, String(redactedHeaders[name]))
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
  Effect.updateService(httpApp, ServerRequest.HttpServerRequest, (request) => {
    const host = request.headers["x-forwarded-host"]
    const remoteAddress = request.headers["x-forwarded-for"]?.split(",")[0].trim()
    return request.modify({
      headers: host !== undefined ? Headers.set(request.headers, "host", host) : undefined,
      remoteAddress
    })
  })
)

/** @internal */
export const searchParamsParser = <E, R>(httpApp: App.Default<E, R>) =>
  Effect.withFiberRuntime<
    HttpServerResponse,
    E,
    ServerRequest.HttpServerRequest | Exclude<R, ServerRequest.ParsedSearchParams>
  >((fiber) => {
    const context = fiber.currentContext
    const request = Context.unsafeGet(context, ServerRequest.HttpServerRequest)
    const params = ServerRequest.searchParamsFromURL(new URL(request.originalUrl))
    return Effect.locally(
      httpApp,
      FiberRef.currentContext,
      Context.add(context, ServerRequest.ParsedSearchParams, params)
    ) as any
  })

/** @internal */
export const cors = (options?: {
  readonly allowedOrigins?: ReadonlyArray<string> | Predicate.Predicate<string> | undefined
  readonly allowedMethods?: ReadonlyArray<string> | undefined
  readonly allowedHeaders?: ReadonlyArray<string> | undefined
  readonly exposedHeaders?: ReadonlyArray<string> | undefined
  readonly maxAge?: number | undefined
  readonly credentials?: boolean | undefined
}) => {
  const opts = {
    allowedOrigins: [],
    allowedMethods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE"],
    allowedHeaders: [],
    exposedHeaders: [],
    credentials: false,
    ...options
  }

  const isAllowedOrigin = typeof opts.allowedOrigins === "function"
    ? opts.allowedOrigins
    : (origin: string) => (opts.allowedOrigins as ReadonlyArray<string>).includes(origin)

  const allowOrigin = typeof opts.allowedOrigins === "function" || opts.allowedOrigins.length > 1 ?
    (originHeader: string): ReadonlyRecord<string, string> | undefined => {
      if (isAllowedOrigin(originHeader)) {
        return {
          "access-control-allow-origin": originHeader,
          vary: "Origin"
        }
      }
      return undefined
    } :
    opts.allowedOrigins.length === 1 ?
    Function.constant({
      "access-control-allow-origin": opts.allowedOrigins[0],
      vary: "Origin"
    }) :
    Function.constant({
      "access-control-allow-origin": "*"
    })

  const allowMethods = opts.allowedMethods.length > 0
    ? { "access-control-allow-methods": opts.allowedMethods.join(", ") }
    : undefined

  const allowCredentials = opts.credentials
    ? { "access-control-allow-credentials": "true" }
    : undefined

  const allowHeaders = (
    accessControlRequestHeaders: string | undefined
  ): ReadonlyRecord<string, string> | undefined => {
    if (opts.allowedHeaders.length === 0 && accessControlRequestHeaders) {
      return {
        vary: "Access-Control-Request-Headers",
        "access-control-allow-headers": accessControlRequestHeaders
      }
    }

    if (opts.allowedHeaders) {
      return {
        "access-control-allow-headers": opts.allowedHeaders.join(",")
      }
    }

    return undefined
  }

  const exposeHeaders = opts.exposedHeaders.length > 0
    ? { "access-control-expose-headers": opts.exposedHeaders.join(",") }
    : undefined

  const maxAge = opts.maxAge
    ? { "access-control-max-age": opts.maxAge.toString() }
    : undefined

  const headersFromRequest = (request: ServerRequest.HttpServerRequest) => {
    const origin = request.headers["origin"]
    return Headers.unsafeFromRecord({
      ...allowOrigin(origin),
      ...allowCredentials,
      ...exposeHeaders
    })
  }

  const headersFromRequestOptions = (request: ServerRequest.HttpServerRequest) => {
    const origin = request.headers["origin"]
    const accessControlRequestHeaders = request.headers["access-control-request-headers"]
    return Headers.unsafeFromRecord({
      ...allowOrigin(origin),
      ...allowCredentials,
      ...exposeHeaders,
      ...allowMethods,
      ...allowHeaders(accessControlRequestHeaders),
      ...maxAge
    })
  }

  const preResponseHandler = (request: ServerRequest.HttpServerRequest, response: HttpServerResponse) =>
    Effect.succeed(ServerResponse.setHeaders(response, headersFromRequest(request)))

  return <E, R>(httpApp: App.Default<E, R>): App.Default<E, R> =>
    Effect.withFiberRuntime((fiber) => {
      const request = Context.unsafeGet(fiber.currentContext, ServerRequest.HttpServerRequest)
      if (request.method === "OPTIONS") {
        return Effect.succeed(ServerResponse.empty({
          status: 204,
          headers: headersFromRequestOptions(request)
        }))
      }
      return Effect.zipRight(internalHttpApp.appendPreResponseHandler(preResponseHandler), httpApp)
    })
}
