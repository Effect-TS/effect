import * as Cookies from "@effect/platform/Cookies"
import type * as Body from "@effect/platform/HttpBody"
import * as Client from "@effect/platform/HttpClient"
import * as Error from "@effect/platform/HttpClientError"
import type * as ClientRequest from "@effect/platform/HttpClientRequest"
import * as ClientResponse from "@effect/platform/HttpClientResponse"
import * as IncomingMessage from "@effect/platform/HttpIncomingMessage"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import { pipe } from "effect/Function"
import * as Layer from "effect/Layer"
import type * as Scope from "effect/Scope"
import * as Stream from "effect/Stream"
import * as Http from "node:http"
import * as Https from "node:https"
import { Readable } from "node:stream"
import { pipeline } from "node:stream/promises"
import type * as NodeClient from "../NodeHttpClient.js"
import * as NodeSink from "../NodeSink.js"
import { HttpIncomingMessageImpl } from "./httpIncomingMessage.js"

/** @internal */
export const HttpAgentTypeId: NodeClient.HttpAgentTypeId = Symbol.for(
  "@effect/platform-node/Http/NodeClient/HttpAgent"
) as NodeClient.HttpAgentTypeId

/** @internal */
export const HttpAgent = Context.GenericTag<NodeClient.HttpAgent>("@effect/platform-node/Http/NodeClient/HttpAgent")

/** @internal */
export const makeAgent = (options?: Https.AgentOptions): Effect.Effect<NodeClient.HttpAgent, never, Scope.Scope> =>
  Effect.map(
    Effect.all([
      Effect.acquireRelease(
        Effect.sync(() => new Http.Agent(options)),
        (agent) => Effect.sync(() => agent.destroy())
      ),
      Effect.acquireRelease(
        Effect.sync(() => new Https.Agent(options)),
        (agent) => Effect.sync(() => agent.destroy())
      )
    ]),
    ([http, https]) => ({
      [HttpAgentTypeId]: HttpAgentTypeId,
      http,
      https
    })
  )

/** @internal */
export const makeAgentLayer = (options?: Https.AgentOptions): Layer.Layer<NodeClient.HttpAgent> =>
  Layer.scoped(HttpAgent, makeAgent(options))

/** @internal */
export const agentLayer = makeAgentLayer()

const fromAgent = (agent: NodeClient.HttpAgent): Client.HttpClient =>
  Client.make((request, url, signal) => {
    const nodeRequest = url.protocol === "https:" ?
      Https.request(url, {
        agent: agent.https,
        method: request.method,
        headers: request.headers,
        signal
      }) :
      Http.request(url, {
        agent: agent.http,
        method: request.method,
        headers: request.headers,
        signal
      })
    return pipe(
      Effect.zipRight(sendBody(nodeRequest, request, request.body), waitForResponse(nodeRequest, request), {
        concurrent: true
      }),
      Effect.map((_) => new ClientResponseImpl(request, _))
    )
  })

const sendBody = (
  nodeRequest: Http.ClientRequest,
  request: ClientRequest.HttpClientRequest,
  body: Body.HttpBody
): Effect.Effect<void, Error.RequestError> =>
  Effect.suspend((): Effect.Effect<void, Error.RequestError> => {
    switch (body._tag) {
      case "Empty": {
        nodeRequest.end()
        return waitForFinish(nodeRequest, request)
      }
      case "Uint8Array":
      case "Raw": {
        nodeRequest.end(body.body)
        return waitForFinish(nodeRequest, request)
      }
      case "FormData": {
        const response = new Response(body.formData)

        response.headers.forEach((value, key) => {
          nodeRequest.setHeader(key, value)
        })

        return Effect.tryPromise({
          try: () => pipeline(Readable.fromWeb(response.body! as any), nodeRequest),
          catch: (cause) =>
            new Error.RequestError({
              request,
              reason: "Transport",
              cause
            })
        })
      }
      case "Stream": {
        return Stream.run(
          Stream.mapError(body.stream, (cause) =>
            new Error.RequestError({
              request,
              reason: "Encode",
              cause
            })),
          NodeSink.fromWritable(() => nodeRequest, (cause) =>
            new Error.RequestError({
              request,
              reason: "Transport",
              cause
            }))
        )
      }
    }
  })

const waitForResponse = (nodeRequest: Http.ClientRequest, request: ClientRequest.HttpClientRequest) =>
  Effect.async<Http.IncomingMessage, Error.RequestError>((resume) => {
    function onError(cause: Error) {
      resume(Effect.fail(
        new Error.RequestError({
          request,
          reason: "Transport",
          cause
        })
      ))
    }
    nodeRequest.on("error", onError)

    function onResponse(response: Http.IncomingMessage) {
      nodeRequest.off("error", onError)
      resume(Effect.succeed(response))
    }
    nodeRequest.on("upgrade", onResponse)
    nodeRequest.on("response", onResponse)

    return Effect.sync(() => {
      nodeRequest.off("error", onError)
      nodeRequest.off("upgrade", onResponse)
      nodeRequest.off("response", onResponse)
    })
  })

const waitForFinish = (nodeRequest: Http.ClientRequest, request: ClientRequest.HttpClientRequest) =>
  Effect.async<void, Error.RequestError>((resume) => {
    function onError(cause: Error) {
      resume(Effect.fail(
        new Error.RequestError({
          request,
          reason: "Transport",
          cause
        })
      ))
    }
    nodeRequest.once("error", onError)

    function onFinish() {
      nodeRequest.off("error", onError)
      resume(Effect.void)
    }
    nodeRequest.once("finish", onFinish)

    return Effect.sync(() => {
      nodeRequest.off("error", onError)
      nodeRequest.off("finish", onFinish)
    })
  })

class ClientResponseImpl extends HttpIncomingMessageImpl<Error.ResponseError>
  implements ClientResponse.HttpClientResponse
{
  readonly [ClientResponse.TypeId]: ClientResponse.TypeId

  constructor(
    readonly request: ClientRequest.HttpClientRequest,
    source: Http.IncomingMessage
  ) {
    super(source, (cause) =>
      new Error.ResponseError({
        request,
        response: this,
        reason: "Decode",
        cause
      }))
    this[ClientResponse.TypeId] = ClientResponse.TypeId
  }

  get status() {
    return this.source.statusCode!
  }

  cachedCookies?: Cookies.Cookies
  get cookies(): Cookies.Cookies {
    if (this.cachedCookies !== undefined) {
      return this.cachedCookies
    }
    const header = this.source.headers["set-cookie"]
    if (Array.isArray(header)) {
      return this.cachedCookies = Cookies.fromSetCookie(header)
    }
    return this.cachedCookies = Cookies.empty
  }

  get formData(): Effect.Effect<FormData, Error.ResponseError> {
    return Effect.tryPromise({
      try: () => {
        const init: {
          headers: HeadersInit
          status?: number
          statusText?: string
        } = {
          headers: new globalThis.Headers(this.source.headers as any)
        }

        if (this.source.statusCode) {
          init.status = this.source.statusCode
        }

        if (this.source.statusMessage) {
          init.statusText = this.source.statusMessage
        }

        return new Response(Readable.toWeb(this.source) as any, init).formData()
      },
      catch: this.onError
    })
  }

  toJSON(): unknown {
    return IncomingMessage.inspect(this, {
      _id: "@effect/platform/HttpClientResponse",
      request: this.request.toJSON(),
      status: this.status
    })
  }
}

/** @internal */
export const make = Effect.map(HttpAgent, fromAgent)

/** @internal */
export const layerWithoutAgent = Client.layerMergedContext(make)

/** @internal */
export const layer = Layer.provide(layerWithoutAgent, agentLayer)
