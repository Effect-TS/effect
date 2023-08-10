import * as Context from "@effect/data/Context"
import { pipe } from "@effect/data/Function"
import * as Effect from "@effect/io/Effect"
import * as Layer from "@effect/io/Layer"
import type * as Scope from "@effect/io/Scope"
import type * as NodeClient from "@effect/platform-node/Http/NodeClient"
import * as NodeSink from "@effect/platform-node/Sink"
import * as NodeStream from "@effect/platform-node/Stream"
import type * as Body from "@effect/platform/Http/Body"
import * as Client from "@effect/platform/Http/Client"
import * as Error from "@effect/platform/Http/ClientError"
import type * as ClientRequest from "@effect/platform/Http/ClientRequest"
import * as ClientResponse from "@effect/platform/Http/ClientResponse"
import * as Headers from "@effect/platform/Http/Headers"
import * as IncomingMessage from "@effect/platform/Http/IncomingMessage"
import * as UrlParams from "@effect/platform/Http/UrlParams"
import * as Stream from "@effect/stream/Stream"
import * as Http from "node:http"
import * as Https from "node:https"
import { Readable } from "node:stream"
import { pipeline } from "node:stream/promises"

/** @internal */
export const HttpAgentTypeId: NodeClient.HttpAgentTypeId = Symbol.for(
  "@effect/platform-node/Http/NodeClient/HttpAgent"
) as NodeClient.HttpAgentTypeId

/** @internal */
export const HttpAgent = Context.Tag<NodeClient.HttpAgent>("@effect/platform-node/Http/NodeClient/HttpAgent")

/** @internal */
export const makeAgent = (options?: Https.AgentOptions): Effect.Effect<Scope.Scope, never, NodeClient.HttpAgent> =>
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
export const agentLayer = Layer.scoped(HttpAgent, makeAgent())

const fromAgent = (agent: NodeClient.HttpAgent): Client.Client.Default =>
  Client.make((request) =>
    Effect.flatMap(
      UrlParams.makeUrl(request.url, request.urlParams, (_) =>
        Error.RequestError({
          request,
          reason: "InvalidUrl",
          error: _
        })),
      (url) =>
        Effect.suspend(() => {
          const controller = new AbortController()
          const nodeRequest = url.protocol === "https:" ?
            Https.request(url, {
              agent: agent.https,
              method: request.method,
              headers: Object.fromEntries(request.headers),
              signal: controller.signal
            }) :
            Http.request(url, {
              agent: agent.http,
              method: request.method,
              headers: Object.fromEntries(request.headers),
              signal: controller.signal
            })
          return pipe(
            Effect.zipRight(sendBody(nodeRequest, request, request.body), waitForResponse(nodeRequest), {
              concurrent: true
            }),
            Effect.onInterrupt(() => Effect.sync(() => controller.abort())),
            Effect.map((_) => new ClientResponseImpl(request, _))
          )
        })
    )
  )

const sendBody = (
  nodeRequest: Http.ClientRequest,
  request: ClientRequest.ClientRequest,
  body: Body.Body
): Effect.Effect<never, Error.RequestError, void> =>
  Effect.suspend((): Effect.Effect<never, Error.RequestError, void> => {
    switch (body._tag) {
      case "Empty": {
        nodeRequest.end()
        return waitForFinish(nodeRequest, request)
      }
      case "Bytes":
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
            Error.RequestError({
              request,
              reason: "Transport",
              error: _
            })
        })
      }
      case "BytesEffect": {
        return Effect.flatMap(
          Effect.mapError(body.body, (_) =>
            Error.RequestError({
              request,
              reason: "Encode",
              error: _
            })),
          (bytes) => {
            nodeRequest.end(bytes)
            return waitForFinish(nodeRequest, request)
          }
        )
      }
      case "Stream": {
        return Stream.run(
          Stream.mapError(body.stream, (_) =>
            Error.RequestError({
              request,
              reason: "Encode",
              error: _
            })),
          NodeSink.fromWritable(() => nodeRequest, (_) =>
            Error.RequestError({
              request,
              reason: "Transport",
              error: _
            }))
        )
      }
    }
  })

const waitForResponse = (nodeRequest: Http.ClientRequest) =>
  Effect.async<never, never, Http.IncomingMessage>((resume) => {
    nodeRequest.on("response", (response) => {
      resume(Effect.succeed(response))
    })
    return Effect.sync(() => {
      nodeRequest.removeAllListeners("response")
    })
  })

const waitForFinish = (nodeRequest: Http.ClientRequest, request: ClientRequest.ClientRequest) =>
  Effect.async<never, Error.RequestError, void>((resume) => {
    nodeRequest.on("error", (error) => {
      resume(Effect.fail(Error.RequestError({
        request,
        reason: "Transport",
        error
      })))
    })

    nodeRequest.on("finish", () => {
      resume(Effect.unit)
    })

    return Effect.sync(() => {
      nodeRequest.removeAllListeners("error")
      nodeRequest.removeAllListeners("finish")
    })
  })

class ClientResponseImpl implements ClientResponse.ClientResponse {
  readonly [IncomingMessage.TypeId]: IncomingMessage.TypeId = IncomingMessage.TypeId
  readonly [ClientResponse.TypeId]: ClientResponse.TypeId = ClientResponse.TypeId

  constructor(
    readonly request: ClientRequest.ClientRequest,
    readonly source: Http.IncomingMessage
  ) {}

  get status() {
    return this.source.statusCode!
  }

  get headers() {
    return Headers.fromInput(this.source.headers as any)
  }

  get text(): Effect.Effect<never, Error.ResponseError, string> {
    return NodeStream.toString(() => this.source, (_) =>
      Error.ResponseError({
        request: this.request,
        response: this,
        reason: "Decode",
        error: _
      }))
  }

  get json(): Effect.Effect<never, Error.ResponseError, unknown> {
    return Effect.tryMap(this.text, {
      try: (_) => JSON.parse(_) as unknown,
      catch: (_) =>
        Error.ResponseError({
          request: this.request,
          response: this,
          reason: "Decode",
          error: _
        })
    })
  }

  get formData(): Effect.Effect<never, Error.ResponseError, FormData> {
    return Effect.tryPromise({
      try: () =>
        new Response(Readable.toWeb(this.source) as any, {
          headers: new globalThis.Headers(this.source.headers as any),
          status: this.source.statusCode,
          statusText: this.source.statusMessage
        }).formData(),
      catch: (_) =>
        Error.ResponseError({
          request: this.request,
          response: this,
          reason: "Decode",
          error: _
        })
    })
  }

  get stream(): Stream.Stream<never, Error.ResponseError, Uint8Array> {
    return NodeStream.fromReadable<Error.ResponseError, Uint8Array>(
      () => this.source,
      (_) =>
        Error.ResponseError({
          request: this.request,
          response: this,
          reason: "Decode",
          error: _
        })
    )
  }

  get arrayBuffer(): Effect.Effect<never, Error.ResponseError, ArrayBuffer> {
    return NodeStream.toUint8Array(() => this.source, (_) =>
      Error.ResponseError({
        request: this.request,
        response: this,
        reason: "Decode",
        error: _
      }))
  }
}

/** @internal */
export const make = Effect.map(HttpAgent, fromAgent)

/** @internal */
export const layer = Layer.provide(
  agentLayer,
  Layer.effect(Client.Client, make)
)
