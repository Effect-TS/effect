import type * as Body from "@effect/platform/Http/Body"
import * as Client from "@effect/platform/Http/Client"
import * as Error from "@effect/platform/Http/ClientError"
import type * as ClientRequest from "@effect/platform/Http/ClientRequest"
import * as ClientResponse from "@effect/platform/Http/ClientResponse"
import * as UrlParams from "@effect/platform/Http/UrlParams"
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
import type * as NodeClient from "../../NodeHttpClient.js"
import * as NodeSink from "../../NodeSink.js"
import { IncomingMessageImpl } from "./incomingMessage.js"

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

const makeAbortController = Effect.acquireRelease(
  Effect.sync(() => new AbortController()),
  (controller) => Effect.sync(() => controller.abort())
)

const fromAgent = (agent: NodeClient.HttpAgent): Client.Client.Default =>
  Client.makeDefault((request) =>
    Effect.flatMap(
      UrlParams.makeUrl(request.url, request.urlParams, (_) =>
        new Error.RequestError({
          request,
          reason: "InvalidUrl",
          error: _
        })),
      (url) =>
        Effect.flatMap(makeAbortController, (controller) => {
          const nodeRequest = url.protocol === "https:" ?
            Https.request(url, {
              agent: agent.https,
              method: request.method,
              headers: request.headers,
              signal: controller.signal
            }) :
            Http.request(url, {
              agent: agent.http,
              method: request.method,
              headers: request.headers,
              signal: controller.signal
            })
          return pipe(
            Effect.zipRight(sendBody(nodeRequest, request, request.body), waitForResponse(nodeRequest, request), {
              concurrent: true
            }),
            Effect.map((_) => new ClientResponseImpl(request, _))
          )
        })
    )
  )

const sendBody = (
  nodeRequest: Http.ClientRequest,
  request: ClientRequest.ClientRequest,
  body: Body.Body
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
          catch: (_) =>
            new Error.RequestError({
              request,
              reason: "Transport",
              error: _
            })
        })
      }
      case "Stream": {
        return Stream.run(
          Stream.mapError(body.stream, (_) =>
            new Error.RequestError({
              request,
              reason: "Encode",
              error: _
            })),
          NodeSink.fromWritable(() => nodeRequest, (_) =>
            new Error.RequestError({
              request,
              reason: "Transport",
              error: _
            }))
        )
      }
    }
  })

const waitForResponse = (nodeRequest: Http.ClientRequest, request: ClientRequest.ClientRequest) =>
  Effect.async<Http.IncomingMessage, Error.RequestError>((resume) => {
    function onError(error: Error) {
      resume(Effect.fail(
        new Error.RequestError({
          request,
          reason: "Transport",
          error
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

const waitForFinish = (nodeRequest: Http.ClientRequest, request: ClientRequest.ClientRequest) =>
  Effect.async<void, Error.RequestError>((resume) => {
    function onError(error: Error) {
      resume(Effect.fail(
        new Error.RequestError({
          request,
          reason: "Transport",
          error
        })
      ))
    }
    nodeRequest.once("error", onError)

    function onFinish() {
      nodeRequest.off("error", onError)
      resume(Effect.unit)
    }
    nodeRequest.once("finish", onFinish)

    return Effect.sync(() => {
      nodeRequest.off("error", onError)
      nodeRequest.off("finish", onFinish)
    })
  })

class ClientResponseImpl extends IncomingMessageImpl<Error.ResponseError> implements ClientResponse.ClientResponse {
  readonly [ClientResponse.TypeId]: ClientResponse.TypeId

  constructor(
    readonly request: ClientRequest.ClientRequest,
    source: Http.IncomingMessage
  ) {
    super(source, (_) =>
      new Error.ResponseError({
        request,
        response: this,
        reason: "Decode",
        error: _
      }))
    this[ClientResponse.TypeId] = ClientResponse.TypeId
  }

  get status() {
    return this.source.statusCode!
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

  toString(): string {
    return `ClientResponse(${this.status})`
  }

  toJSON(): unknown {
    return {
      _tag: "ClientResponse",
      status: this.status,
      headers: this.headers
    }
  }
}

/** @internal */
export const make = Effect.map(HttpAgent, fromAgent)

/** @internal */
export const layerWithoutAgent = Layer.effect(Client.Client, make)

/** @internal */
export const layer = Layer.provide(layerWithoutAgent, agentLayer)
