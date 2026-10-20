/**
 * Tests `HttpApi` implementations through an in-memory generated client.
 *
 * The helpers use the same request encoding, routing, response encoding, and
 * client decoding as the normal `HttpApiBuilder` and `HttpApiClient` pipeline,
 * but they do not start an HTTP server. This is useful for focused handler
 * tests, schema round trips, middleware behavior, and typed client calls.
 *
 * @stability unstable
 * @since 4.0.0
 */
import * as Cause from "../Cause.ts"
import * as Context from "../Context.ts"
import * as Effect from "../Effect.ts"
import * as Exit from "../Exit.ts"
import * as Fiber from "../Fiber.ts"
import type { FileSystem } from "../FileSystem.ts"
import type { Generator } from "../http/Etag.ts"
import * as HttpBody from "../http/HttpBody.ts"
import * as HttpClient from "../http/HttpClient.ts"
import * as HttpClientError from "../http/HttpClientError.ts"
import * as HttpClientRequest from "../http/HttpClientRequest.ts"
import type * as HttpClientResponse from "../http/HttpClientResponse.ts"
import * as HttpEffect from "../http/HttpEffect.ts"
import type { HttpPlatform } from "../http/HttpPlatform.ts"
import * as HttpRouter from "../http/HttpRouter.ts"
import { ClientAbort } from "../http/HttpServerError.ts"
import * as HttpServerRequest from "../http/HttpServerRequest.ts"
import * as HttpServerResponse from "../http/HttpServerResponse.ts"
import { CurrentRequestState, RequestState } from "../http/internal/requestState.ts"
import * as Layer from "../Layer.ts"
import type { Path } from "../Path.ts"
import * as Scope from "../Scope.ts"
import * as Stream from "../Stream.ts"
import type * as HttpApi from "./HttpApi.ts"
import type { HandlerRuntime } from "./HttpApiBuilder.ts"
import * as HttpApiBuilder from "./HttpApiBuilder.ts"
import * as HttpApiClient from "./HttpApiClient.ts"
import type * as HttpApiEndpoint from "./HttpApiEndpoint.ts"
import type * as HttpApiGroup from "./HttpApiGroup.ts"

/**
 * Creates an in-memory client for testing selected groups of an `HttpApi`.
 *
 * **Details**
 *
 * Handlers for the selected groups are taken from the environment; unselected
 * groups are wired with placeholder handlers that fail if called.
 *
 * Each call runs its handler in a request scope that is a child of the
 * `Scope` the client was created in. A streaming response keeps that scope
 * open until its body ends, and a body that is never read is closed with the
 * owning `Scope`.
 *
 * A `Stream` payload reaches the handler unbuffered: each element is pulled
 * from the caller's stream as the handler reads it. If the caller's stream
 * fails, the handler is interrupted as a client abort and the client returns
 * the stream's error, both before the response and while reading a streaming
 * response body. Socket behavior such as draining unread bodies, closing the
 * connection, or answering with `499` is not emulated.
 *
 * @stability unstable
 * @category testing
 * @since 4.0.0
 */
export const groups = Effect.fnUntraced(function*<
  ApiId extends string,
  Groups extends HttpApiGroup.Constraint,
  const Identifiers extends ReadonlyArray<HttpApiGroup.Identifier<Groups>>,
  SelectedGroups extends HttpApiGroup.Constraint = HttpApiGroup.WithIdentifier<Groups, Identifiers[number]>
>(
  api: HttpApi.HttpApi<ApiId, Groups>,
  groupIdentifiers: Identifiers,
  options?: {
    readonly baseUrl?: string | URL | undefined
  }
): Effect.fn.Return<
  HttpApiClient.Client<Groups>,
  never,
  | HttpApiGroup.ToService<ApiId, SelectedGroups>
  | HttpApiGroup.MiddlewareClient<Groups>
  | HttpApiEndpoint.Middleware<HttpApiGroup.Endpoints<Groups>>
  | FileSystem
  | Generator
  | HttpPlatform
  | Path
  | Scope.Scope
> {
  let context = yield* Effect.context<HttpApiGroup.ToService<ApiId, SelectedGroups>>()

  const groups = api.groups as unknown as Record<string, HttpApiGroup.Top>
  for (const identifier in groups) {
    const group = groups[identifier]
    if (groupIdentifiers.includes(identifier as any)) {
      continue
    }
    const handlers = new Map<string, HandlerRuntime>()
    const routes: Array<HttpRouter.Route<any, any>> = []
    for (const endpointIdentifier in group.endpoints) {
      const endpoint = group.endpoints[endpointIdentifier]
      const handler: HandlerRuntime = {
        endpoint: endpoint as any,
        handler: () => Effect.die(new Error(`Unhandled endpoint: ${endpointIdentifier}`)),
        isRaw: false,
        uninterruptible: false
      }
      handlers.set(endpointIdentifier, handler)
      routes.push(HttpApiBuilder.handlerToRoute(api, group as any, handler, context))
    }
    context = Context.add(context, group as any, { handlers, routes })
  }

  const layer: Layer.Layer<
    never,
    never,
    | FileSystem
    | Generator
    | HttpPlatform
    | HttpRouter.HttpRouter
    | Path
  > = HttpApiBuilder.layer(api).pipe(
    Layer.provide(Layer.succeedContext(context))
  ) as any
  const handler = yield* HttpRouter.toHttpEffect(layer)
  const scope = yield* Effect.scope
  const httpClient = HttpClient.make((request) => {
    const requestScope = Scope.forkUnsafe(scope)
    let fiber: Fiber.Fiber<HttpServerResponse.HttpServerResponse, unknown> | undefined
    let abortCause: Cause.Cause<unknown> | undefined
    let transferred = false

    // A failing source is a client abort. The fiber is captured at fork time
    // because the handler may pull the payload on another fiber.
    const body = request.body
    const serverRequest = HttpServerRequest.fromClientRequest(
      body._tag === "Stream"
        ? HttpClientRequest.setBody(
          request,
          HttpBody.stream(
            Stream.catchCause(body.stream, (cause) => {
              if (!Cause.hasInterruptsOnly(cause)) {
                abortCause = cause
                fiber?.interruptUnsafe(undefined, ClientAbort.annotation)
              }
              return Stream.failCause(cause)
            }),
            body.contentType,
            body.contentLength
          )
        )
        : request
    )
    const transportError = (cause: Cause.Cause<unknown>) =>
      new HttpClientError.HttpClientError({
        reason: new HttpClientError.TransportError({
          request,
          cause: Cause.squash(cause),
          description: "The request body stream failed"
        })
      })

    const state = new RequestState()
    const handled = handler.pipe(
      Effect.flatMap((response) => {
        const preResponse = state.preResponseHandler
        return preResponse === undefined ? Effect.succeed(response) : preResponse(serverRequest, response)
      }),
      Effect.map((response) => {
        const transfer = HttpEffect.scopeTransferToStream(response)
        transferred = transfer !== response
        return transfer
      }),
      Effect.provideService(HttpServerRequest.HttpServerRequest, serverRequest),
      Effect.provideService(CurrentRequestState, state),
      Effect.provideService(Scope.Scope, requestScope)
    )

    return Effect.forkIn(handled, requestScope).pipe(
      Effect.flatMap((forked) => {
        fiber = forked
        return Fiber.await(forked)
      }),
      Effect.flatMap((exit): Effect.Effect<HttpClientResponse.HttpClientResponse, HttpClientError.HttpClientError> => {
        if (abortCause !== undefined) {
          return Effect.fail(transportError(abortCause))
        }
        if (Exit.isFailure(exit)) {
          return Effect.orDie(Effect.failCause(exit.cause))
        }
        const response = HttpServerResponse.toClientResponse(exit.value, { request })
        if (body._tag !== "Stream") {
          return Effect.succeed(response)
        }
        return Effect.succeed(Object.create(response, {
          stream: {
            get: () =>
              Stream.catchCause(response.stream, (cause) =>
                abortCause !== undefined && !Cause.hasInterruptsOnly(cause)
                  ? Stream.fail(transportError(abortCause))
                  : Stream.failCause(cause))
          }
        }))
      }),
      Effect.onExit((exit) => transferred && Exit.isSuccess(exit) ? Effect.void : Scope.close(requestScope, exit))
    )
  })

  return yield* HttpApiClient.makeWith(api, {
    httpClient,
    baseUrl: options?.baseUrl ?? "http://localhost:3000"
  })
})
