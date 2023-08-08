import * as Effect from "@effect/io/Effect"
import type * as Error from "@effect/platform/Http/ClientError"
import type * as ClientRequest from "@effect/platform/Http/ClientRequest"
import type * as ClientResponse from "@effect/platform/Http/ClientResponse"
import type * as FormData from "@effect/platform/Http/FormData"
import * as Headers from "@effect/platform/Http/Headers"
import * as IncomingMessage from "@effect/platform/Http/IncomingMessage"
import * as internalError from "@effect/platform/internal/http/clientError"
import * as Stream from "@effect/stream/Stream"

/** @internal */
export const TypeId: ClientResponse.TypeId = Symbol.for("@effect/platform/Http/ClientResponse") as ClientResponse.TypeId

/** @internal */
export const fromWeb = (
  request: ClientRequest.ClientRequest,
  source: globalThis.Response
): ClientResponse.ClientResponse => new ClientResponseImpl(request, source)

class ClientResponseImpl implements ClientResponse.ClientResponse {
  readonly [IncomingMessage.TypeId]: IncomingMessage.TypeId = IncomingMessage.TypeId
  readonly [TypeId]: ClientResponse.TypeId = TypeId

  constructor(
    private readonly request: ClientRequest.ClientRequest,
    private readonly source: globalThis.Response
  ) {}

  get status(): number {
    return this.source.status
  }

  get headers(): Headers.Headers {
    return Headers.fromInput(this.source.headers)
  }

  get stream(): Stream.Stream<never, Error.ResponseError, Uint8Array> {
    return this.source.body
      ? Stream.fromReadableStream(() => this.source.body!, (_) =>
        internalError.responseError({
          request: this.request,
          response: this,
          reason: "Decode",
          error: _
        }))
      : Stream.fail(internalError.responseError({
        request: this.request,
        response: this,
        reason: "EmptyBody",
        error: "can not create stream from empty body"
      }))
  }

  get json(): Effect.Effect<never, Error.ResponseError, unknown> {
    return Effect.tryPromise({
      try: () => this.source.json(),
      catch: (_) =>
        internalError.responseError({
          request: this.request,
          response: this,
          reason: "Decode",
          error: _
        })
    })
  }

  get text(): Effect.Effect<never, Error.ResponseError, string> {
    return Effect.tryPromise({
      try: () => this.source.text(),
      catch: (_) =>
        internalError.responseError({
          request: this.request,
          response: this,
          reason: "Decode",
          error: _
        })
    })
  }

  get formData(): Effect.Effect<never, Error.ResponseError, FormData> {
    return Effect.tryPromise({
      try: () => this.source.formData(),
      catch: (_) =>
        internalError.responseError({
          request: this.request,
          response: this,
          reason: "Decode",
          error: _
        })
    })
  }

  get formDataStream(): Stream.Stream<never, Error.ResponseError, FormData.Part> {
    return Stream.fail(internalError.responseError({
      request: this.request,
      response: this,
      reason: "Decode",
      error: "not implemented"
    }))
  }

  get blob(): Effect.Effect<never, Error.ResponseError, Blob> {
    return Effect.tryPromise({
      try: () => this.source.blob(),
      catch: (_) =>
        internalError.responseError({
          request: this.request,
          response: this,
          reason: "Decode",
          error: _
        })
    })
  }
}
