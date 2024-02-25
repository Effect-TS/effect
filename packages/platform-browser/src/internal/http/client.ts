import * as Client from "@effect/platform/Http/Client"
import * as Error from "@effect/platform/Http/ClientError"
import type * as ClientRequest from "@effect/platform/Http/ClientRequest"
import * as ClientResponse from "@effect/platform/Http/ClientResponse"
import * as Headers from "@effect/platform/Http/Headers"
import * as IncomingMessage from "@effect/platform/Http/IncomingMessage"
import * as UrlParams from "@effect/platform/Http/UrlParams"
import * as Effect from "effect/Effect"
import * as FiberRef from "effect/FiberRef"
import type { LazyArg } from "effect/Function"
import { globalValue } from "effect/GlobalValue"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as Stream from "effect/Stream"
import * as HeaderParser from "multipasta/HeadersParser"

/** @internal */
export const currentXMLHttpRequest = globalValue(
  "@effect/platform-browser/BrowserHttpClient/currentXMLHttpRequest",
  () => FiberRef.unsafeMake<LazyArg<XMLHttpRequest>>(() => new XMLHttpRequest())
)

/** @internal */
export const makeXMLHttpRequest = Client.makeDefault((request) =>
  UrlParams.makeUrl(request.url, request.urlParams, (_) =>
    Error.RequestError({
      request,
      reason: "InvalidUrl",
      error: _
    })).pipe(
      Effect.zip(
        Effect.flatMap(FiberRef.get(currentXMLHttpRequest), (makeXhr) =>
          Effect.acquireRelease({
            acquire: Effect.sync(() => makeXhr()),
            release: (xhr) =>
              Effect.sync(() => {
                xhr.abort()
                xhr.onreadystatechange = null
              })
          }))
      ),
      Effect.flatMap(([url, xhr]) => {
        xhr.open(request.method, url.toString(), true)
        xhr.responseType = "text"
        Object.entries(request.headers).forEach(([k, v]) => {
          xhr.setRequestHeader(k, v)
        })
        return sendBody(xhr, request).pipe(
          Effect.zipLeft(Effect.async<void, Error.RequestError>((resume) => {
            const onChange = () => {
              if (xhr.readyState >= 2) {
                resume(Effect.unit)
              }
            }
            xhr.onreadystatechange = onChange
            xhr.onerror = (_event) => {
              resume(Effect.fail(Error.RequestError({
                request,
                reason: "Transport",
                error: xhr.statusText
              })))
            }
            onChange()
          })),
          Effect.as(new ClientResponseImpl(request, xhr))
        )
      })
    )
)

const sendBody = (
  xhr: XMLHttpRequest,
  request: ClientRequest.ClientRequest
): Effect.Effect<void, Error.RequestError> => {
  const body = request.body
  switch (body._tag) {
    case "Empty":
      return Effect.sync(() => xhr.send())
    case "Raw":
      return Effect.sync(() => xhr.send(body.body as any))
    case "Uint8Array":
      return Effect.sync(() => xhr.send(body.body))
    case "FormData":
      return Effect.sync(() => xhr.send(body.formData))
    case "Stream":
      return Effect.matchEffect(
        Stream.runFold(body.stream, new Uint8Array(0), (acc, chunk) => {
          const next = new Uint8Array(acc.length + chunk.length)
          next.set(acc, 0)
          next.set(chunk, acc.length)
          return next
        }),
        {
          onFailure: (error) =>
            Effect.fail(Error.RequestError({
              request,
              reason: "Encode",
              error
            })),
          onSuccess: (body) => Effect.sync(() => xhr.send(body))
        }
      )
  }
}

const encoder = new TextEncoder()

/** @internal */
export class IncomingMessageImpl<E> implements IncomingMessage.IncomingMessage<E> {
  readonly [IncomingMessage.TypeId]: IncomingMessage.TypeId

  constructor(
    readonly source: XMLHttpRequest,
    readonly onError: (error: unknown) => E
  ) {
    this[IncomingMessage.TypeId] = IncomingMessage.TypeId
  }

  _headers: Headers.Headers | undefined
  get headers() {
    if (this._headers) {
      return this._headers
    }
    const headers = this.source.getAllResponseHeaders()
    if (headers === "") {
      return Headers.empty
    }
    const parser = HeaderParser.make()
    const result = parser(encoder.encode(headers + "\r\n"), 0)
    const parsed = result._tag === "Headers" ? Headers.fromInput(result.headers) : Headers.empty
    return this._headers = parsed
  }

  get remoteAddress() {
    return Option.none()
  }

  _textEffect: Effect.Effect<string, E> | undefined
  get text(): Effect.Effect<string, E> {
    if (this._textEffect) {
      return this._textEffect
    }
    return this._textEffect = Effect.async<string, E>((resume) => {
      if (this.source.readyState === 4) {
        resume(Effect.succeed(this.source.responseText))
        return
      }

      const onReadyStateChange = () => {
        if (this.source.readyState === 4) {
          resume(Effect.succeed(this.source.responseText))
        }
      }
      const onError = () => {
        resume(Effect.fail(this.onError(this.source.statusText)))
      }
      this.source.addEventListener("readystatechange", onReadyStateChange)
      this.source.addEventListener("error", onError)
      return Effect.sync(() => {
        this.source.removeEventListener("readystatechange", onReadyStateChange)
        this.source.removeEventListener("error", onError)
      })
    }).pipe(
      Effect.cached,
      Effect.runSync
    )
  }

  get json(): Effect.Effect<unknown, E> {
    return Effect.tryMap(this.text, {
      try: (_) => _ === "" ? null : JSON.parse(_) as unknown,
      catch: this.onError
    })
  }

  get urlParamsBody(): Effect.Effect<UrlParams.UrlParams, E> {
    return Effect.flatMap(this.text, (_) =>
      Effect.try({
        try: () => UrlParams.fromInput(new URLSearchParams(_)),
        catch: this.onError
      }))
  }

  get stream(): Stream.Stream<Uint8Array, E> {
    return Stream.async<Uint8Array, E>((emit) => {
      let offset = 0
      const onReadyStateChange = () => {
        if (this.source.readyState === 3) {
          emit.single(encoder.encode(this.source.responseText.slice(offset)))
          offset = this.source.responseText.length
        } else if (this.source.readyState === 4) {
          if (offset < this.source.responseText.length) {
            emit.single(encoder.encode(this.source.responseText.slice(offset)))
          }
          emit.end()
        }
      }
      const onError = () => {
        emit.fail(this.onError(this.source.statusText))
      }
      this.source.addEventListener("readystatechange", onReadyStateChange)
      this.source.addEventListener("error", onError)
      onReadyStateChange()
      return Effect.sync(() => {
        this.source.removeEventListener("readystatechange", onReadyStateChange)
        this.source.removeEventListener("error", onError)
      })
    })
  }

  get arrayBuffer(): Effect.Effect<ArrayBuffer, E> {
    return this.text.pipe(
      Effect.map((_) => encoder.encode(_).buffer)
    )
  }
}

class ClientResponseImpl extends IncomingMessageImpl<Error.ResponseError> implements ClientResponse.ClientResponse {
  readonly [ClientResponse.TypeId]: ClientResponse.TypeId

  constructor(
    readonly request: ClientRequest.ClientRequest,
    source: XMLHttpRequest
  ) {
    super(source, (_) =>
      Error.ResponseError({
        request,
        response: this,
        reason: "Decode",
        error: _
      }))
    this[ClientResponse.TypeId] = ClientResponse.TypeId
  }

  get status() {
    return this.source.status
  }

  get formData(): Effect.Effect<FormData, Error.ResponseError> {
    return Effect.die("Not implemented")
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
export const layerXMLHttpRequest = Layer.succeed(Client.Client, makeXMLHttpRequest)
