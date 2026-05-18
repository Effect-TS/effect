/**
 * @since 1.0.0
 */
import * as Cause from "effect/Cause"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Fiber from "effect/Fiber"
import type * as FiberRef from "effect/FiberRef"
import * as GlobalValue from "effect/GlobalValue"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as Runtime from "effect/Runtime"
import * as Scope from "effect/Scope"
import * as Stream from "effect/Stream"
import type * as Types from "effect/Types"
import { unify } from "effect/Unify"
import * as HttpBody from "./HttpBody.js"
import type { HttpMiddleware } from "./HttpMiddleware.js"
import * as ServerError from "./HttpServerError.js"
import * as ServerRequest from "./HttpServerRequest.js"
import * as ServerResponse from "./HttpServerResponse.js"
import * as internal from "./internal/httpApp.js"
import * as internalMiddleware from "./internal/httpMiddleware.js"

/**
 * @since 1.0.0
 * @category models
 */
export type HttpApp<A = ServerResponse.HttpServerResponse, E = never, R = never> = Effect.Effect<
  A,
  E,
  R | ServerRequest.HttpServerRequest
>

/**
 * @since 1.0.0
 * @category models
 */
export type Default<E = never, R = never> = HttpApp<ServerResponse.HttpServerResponse, E, R>

const handledSymbol = Symbol.for("@effect/platform/HttpApp/handled")

/**
 * @since 1.0.0
 * @category combinators
 */
export const toHandled = <E, R, _, EH, RH>(
  self: Default<E, R>,
  handleResponse: (
    request: ServerRequest.HttpServerRequest,
    response: ServerResponse.HttpServerResponse
  ) => Effect.Effect<_, EH, RH>,
  middleware?: HttpMiddleware | undefined
): Effect.Effect<void, never, Exclude<R | RH | ServerRequest.HttpServerRequest, Scope.Scope>> => {
  const responded = Effect.withFiberRuntime<
    ServerResponse.HttpServerResponse,
    E | EH | ServerError.ResponseError,
    R | RH | ServerRequest.HttpServerRequest
  >((fiber) =>
    Effect.flatMap(self, (response) => {
      const request = Context.unsafeGet(fiber.currentContext, ServerRequest.HttpServerRequest)
      const handler = fiber.getFiberRef(currentPreResponseHandlers)
      if (handler._tag === "None") {
        ;(request as any)[handledSymbol] = true
        return Effect.as(handleResponse(request, response), response)
      }
      return Effect.tap(handler.value(request, response), (response) => {
        ;(request as any)[handledSymbol] = true
        return handleResponse(request, response)
      })
    })
  )

  const withErrorHandling = Effect.catchAllCause(
    responded,
    (cause) =>
      Effect.withFiberRuntime<
        ServerResponse.HttpServerResponse,
        E | EH | ServerError.ResponseError,
        ServerRequest.HttpServerRequest | RH
      >((fiber) =>
        Effect.flatMap(ServerError.causeResponse(cause), ([response, cause]) => {
          const request = Context.unsafeGet(fiber.currentContext, ServerRequest.HttpServerRequest)
          const handler = fiber.getFiberRef(currentPreResponseHandlers)
          if (handler._tag === "None") {
            ;(request as any)[handledSymbol] = true
            return Effect.zipRight(
              handleResponse(request, response),
              Cause.isEmptyType(cause) ? Effect.succeed(response) : Effect.failCause(cause)
            )
          }
          return Effect.zipRight(
            Effect.tap(handler.value(request, response), (response) => {
              ;(request as any)[handledSymbol] = true
              return handleResponse(request, response)
            }),
            Cause.isEmptyType(cause) ? Effect.succeed(response) : Effect.failCause(cause)
          )
        })
      )
  )

  const withMiddleware = unify(
    middleware === undefined ?
      internalMiddleware.tracer(withErrorHandling) :
      Effect.matchCauseEffect(internalMiddleware.tracer(middleware(withErrorHandling)), {
        onFailure: (cause): Effect.Effect<void, EH, RH> =>
          Effect.withFiberRuntime((fiber) => {
            const request = Context.unsafeGet(fiber.currentContext, ServerRequest.HttpServerRequest)
            if (handledSymbol in request) {
              return Effect.void
            }
            return Effect.matchCauseEffect(ServerError.causeResponse(cause), {
              onFailure: (_cause) => handleResponse(request, ServerResponse.empty({ status: 500 })),
              onSuccess: ([response]) => handleResponse(request, response)
            })
          }),
        onSuccess: (response): Effect.Effect<void, EH, RH> =>
          Effect.withFiberRuntime((fiber) => {
            const request = Context.unsafeGet(fiber.currentContext, ServerRequest.HttpServerRequest)
            return handledSymbol in request ? Effect.void : handleResponse(request, response)
          })
      })
  )

  return Effect.uninterruptible(scoped(withMiddleware)) as any
}

/**
 * If you want to finalize the http request scope elsewhere, you can use this
 * function to eject from the default scope closure.
 *
 * @since 1.0.0
 * @category Scope
 */
export const ejectDefaultScopeClose = (scope: Scope.Scope): void => {
  ejectedScopes.add(scope)
}

/**
 * @since 1.0.0
 * @category Scope
 */
export const unsafeEjectStreamScope = (
  response: ServerResponse.HttpServerResponse
): ServerResponse.HttpServerResponse => {
  if (response.body._tag !== "Stream") {
    return response
  }
  const fiber = Option.getOrThrow(Fiber.getCurrentFiber())
  const scope = Context.unsafeGet(fiber.currentContext, Scope.Scope) as Scope.CloseableScope
  ejectDefaultScopeClose(scope)
  return ServerResponse.setBody(
    response,
    HttpBody.stream(
      Stream.ensuring(response.body.stream, Scope.close(scope, Exit.void)),
      response.body.contentType,
      response.body.contentLength
    )
  )
}

const ejectedScopes = GlobalValue.globalValue(
  "@effect/platform/HttpApp/ejectedScopes",
  () => new WeakSet<Scope.Scope>()
)

const scoped = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
  Effect.flatMap(Scope.make(), (scope) =>
    Effect.onExit(Scope.extend(effect, scope), (exit) => {
      if (ejectedScopes.has(scope)) {
        return Effect.void
      }
      return Scope.close(scope, exit)
    }))

/**
 * @since 1.0.0
 * @category models
 */
export type PreResponseHandler = (
  request: ServerRequest.HttpServerRequest,
  response: ServerResponse.HttpServerResponse
) => Effect.Effect<ServerResponse.HttpServerResponse, ServerError.ResponseError>

/**
 * @since 1.0.0
 * @category fiber refs
 */
export const currentPreResponseHandlers: FiberRef.FiberRef<Option.Option<PreResponseHandler>> =
  internal.currentPreResponseHandlers

/**
 * @since 1.0.0
 * @category fiber refs
 */
export const appendPreResponseHandler: (handler: PreResponseHandler) => Effect.Effect<void> =
  internal.appendPreResponseHandler

/**
 * @since 1.0.0
 * @category fiber refs
 */
export const withPreResponseHandler = internal.withPreResponseHandler

/**
 * @since 1.0.0
 * @category conversions
 */
export const toWebHandlerRuntime = <R>(runtime: Runtime.Runtime<R>) => {
  const httpRuntime: Types.Mutable<Runtime.Runtime<R>> = Runtime.make(runtime)
  const run = Runtime.runFork(httpRuntime)
  return <E>(self: Default<E, R | Scope.Scope>, middleware?: HttpMiddleware | undefined) => {
    const resolveSymbol = Symbol.for("@effect/platform/HttpApp/resolve")
    const httpApp = toHandled(self, (request, response) => {
      response = unsafeEjectStreamScope(response)
      ;(request as any)[resolveSymbol](
        ServerResponse.toWeb(response, { withoutBody: request.method === "HEAD", runtime })
      )
      return Effect.void
    }, middleware)
    return (request: Request, context?: Context.Context<never> | undefined): Promise<Response> =>
      new Promise((resolve) => {
        const contextMap = new Map<string, any>(runtime.context.unsafeMap)
        if (Context.isContext(context)) {
          for (const [key, value] of context.unsafeMap) {
            contextMap.set(key, value)
          }
        }
        const httpServerRequest = ServerRequest.fromWeb(request)
        contextMap.set(ServerRequest.HttpServerRequest.key, httpServerRequest)
        ;(httpServerRequest as any)[resolveSymbol] = resolve
        httpRuntime.context = Context.unsafeMake(contextMap)
        const fiber = run(httpApp as any)
        request.signal?.addEventListener("abort", () => {
          fiber.unsafeInterruptAsFork(ServerError.clientAbortFiberId)
        }, { once: true })
      })
  }
}

/**
 * @since 1.0.0
 * @category conversions
 */
export const toWebHandler: <E>(
  self: Default<E, Scope.Scope>,
  middleware?: HttpMiddleware | undefined
) => (request: Request, context?: Context.Context<never> | undefined) => Promise<Response> = toWebHandlerRuntime(
  Runtime.defaultRuntime
)

/**
 * @since 1.0.0
 * @category conversions
 */
export const toWebHandlerLayerWith = <E, R, RE, EX>(
  layer: Layer.Layer<R, RE>,
  options: {
    readonly toHandler: (
      runtime: Runtime.Runtime<R>
    ) => Effect.Effect<
      Effect.Effect<ServerResponse.HttpServerResponse, E, R | Scope.Scope | ServerRequest.HttpServerRequest>,
      EX
    >
    readonly middleware?: HttpMiddleware | undefined
    readonly memoMap?: Layer.MemoMap | undefined
  }
): {
  readonly dispose: () => Promise<void>
  readonly handler: (request: Request, context?: Context.Context<never> | undefined) => Promise<Response>
} => {
  const scope = Effect.runSync(Scope.make())
  const dispose = () => Effect.runPromise(Scope.close(scope, Exit.void))

  let handlerCache: ((request: Request, context?: Context.Context<never> | undefined) => Promise<Response>) | undefined
  let handlerPromise:
    | Promise<(request: Request, context?: Context.Context<never> | undefined) => Promise<Response>>
    | undefined
  function handler(request: Request, context?: Context.Context<never> | undefined): Promise<Response> {
    if (handlerCache) {
      return handlerCache(request, context)
    }
    handlerPromise ??= Effect.gen(function*() {
      const runtime = yield* (options.memoMap
        ? Layer.toRuntimeWithMemoMap(layer, options.memoMap)
        : Layer.toRuntime(layer))
      return handlerCache = toWebHandlerRuntime(runtime)(
        yield* options.toHandler(runtime),
        options.middleware
      )
    }).pipe(
      Scope.extend(scope),
      Effect.runPromise
    )
    return handlerPromise.then((f) => f(request, context))
  }
  return { dispose, handler } as const
}

/**
 * @since 1.0.0
 * @category conversions
 */
export const toWebHandlerLayer = <E, R, RE>(
  self: Default<E, R | Scope.Scope>,
  layer: Layer.Layer<R, RE>,
  options?: {
    readonly memoMap?: Layer.MemoMap | undefined
    readonly middleware?: HttpMiddleware | undefined
  }
): {
  readonly dispose: () => Promise<void>
  readonly handler: (request: Request, context?: Context.Context<never> | undefined) => Promise<Response>
} =>
  toWebHandlerLayerWith(layer, {
    ...options,
    toHandler: () => Effect.succeed(self)
  })

/**
 * @since 1.0.0
 * @category conversions
 */
export const fromWebHandler = (
  handler: (request: Request) => Promise<Response>
): Default<ServerError.HttpServerError> =>
  Effect.async((resume, signal) => {
    const fiber = Option.getOrThrow(Fiber.getCurrentFiber())
    const request = Context.unsafeGet(fiber.currentContext, ServerRequest.HttpServerRequest)
    const requestResult = ServerRequest.toWebEither(request, {
      signal,
      runtime: Runtime.make({
        context: fiber.currentContext,
        fiberRefs: fiber.getFiberRefs(),
        runtimeFlags: Runtime.defaultRuntimeFlags
      })
    })
    if (requestResult._tag === "Left") {
      return resume(Effect.fail(requestResult.left))
    }
    handler(requestResult.right).then(
      (response) => resume(Effect.succeed(ServerResponse.fromWeb(response))),
      (cause) =>
        resume(Effect.fail(
          new ServerError.RequestError({
            cause,
            request,
            reason: "Transport",
            description: "HttpApp.fromWebHandler: Error in handler"
          })
        ))
    )
  })
