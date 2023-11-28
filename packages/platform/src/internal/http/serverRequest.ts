import type * as Schema from "@effect/schema/Schema"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Option from "effect/Option"
import type * as Scope from "effect/Scope"
import * as Stream from "effect/Stream"
import type * as FileSystem from "../../FileSystem.js"
import * as FormData from "../../Http/FormData.js"
import * as Headers from "../../Http/Headers.js"
import * as IncomingMessage from "../../Http/IncomingMessage.js"
import type { Method } from "../../Http/Method.js"
import * as Error from "../../Http/ServerError.js"
import type * as ServerRequest from "../../Http/ServerRequest.js"
import * as UrlParams from "../../Http/UrlParams.js"
import type * as Path from "../../Path.js"

/** @internal */
export const TypeId: ServerRequest.TypeId = Symbol.for("@effect/platform/Http/ServerRequest") as ServerRequest.TypeId

/** @internal */
export const serverRequestTag = Context.Tag<ServerRequest.ServerRequest>(TypeId)

/** @internal */
export const persistedFormData = Effect.flatMap(serverRequestTag, (request) => request.formData)

/** @internal */
export const schemaHeaders = <I extends Readonly<Record<string, string>>, A>(schema: Schema.Schema<I, A>) => {
  const parse = IncomingMessage.schemaHeaders(schema)
  return Effect.flatMap(serverRequestTag, parse)
}

/** @internal */
export const schemaBodyJson = <I, A>(schema: Schema.Schema<I, A>) => {
  const parse = IncomingMessage.schemaBodyJson(schema)
  return Effect.flatMap(serverRequestTag, parse)
}

/** @internal */
export const schemaBodyUrlParams = <I extends Readonly<Record<string, string>>, A>(schema: Schema.Schema<I, A>) => {
  const parse = IncomingMessage.schemaBodyUrlParams(schema)
  return Effect.flatMap(serverRequestTag, parse)
}

/** @internal */
export const schemaFormData = <I extends FormData.PersistedFormData, A>(
  schema: Schema.Schema<I, A>
) => {
  const parse = FormData.schemaPersisted(schema)
  return Effect.flatMap(persistedFormData, parse)
}

/** @internal */
export const schemaFormDataJson = <I, A>(schema: Schema.Schema<I, A>) => {
  const parse = FormData.schemaJson(schema)
  return (field: string) =>
    Effect.flatMap(serverRequestTag, (request) =>
      Effect.flatMap(
        request.formData,
        (formData) =>
          Effect.catchTag(
            parse(formData, field),
            "FormDataError",
            (error) =>
              Effect.fail(
                Error.RequestError({
                  reason: "Decode",
                  request,
                  error: error.error
                })
              )
          )
      ))
}

/** @internal */
export const fromWeb = (request: globalThis.Request): ServerRequest.ServerRequest =>
  new ServerRequestImpl(request, request.url)

class ServerRequestImpl implements ServerRequest.ServerRequest {
  readonly [TypeId]: ServerRequest.TypeId
  readonly [IncomingMessage.TypeId]: IncomingMessage.TypeId
  constructor(
    readonly source: Request,
    readonly url: string,
    public headersOverride?: Headers.Headers,
    private remoteAddressOverride?: string
  ) {
    this[TypeId] = TypeId
    this[IncomingMessage.TypeId] = IncomingMessage.TypeId
  }
  modify(
    options: {
      readonly url?: string | undefined
      readonly headers?: Headers.Headers | undefined
      readonly remoteAddress?: string | undefined
    }
  ) {
    return new ServerRequestImpl(
      this.source,
      options.url ?? this.url,
      options.headers ?? this.headersOverride,
      options.remoteAddress ?? this.remoteAddressOverride
    )
  }
  get method(): Method {
    return this.source.method.toUpperCase() as Method
  }
  get originalUrl() {
    return this.source.url
  }
  get remoteAddress(): Option.Option<string> {
    return this.remoteAddressOverride ? Option.some(this.remoteAddressOverride) : Option.none()
  }
  get headers(): Headers.Headers {
    this.headersOverride ??= Headers.fromInput(this.source.headers)
    return this.headersOverride
  }

  get stream(): Stream.Stream<never, Error.RequestError, Uint8Array> {
    return this.source.body
      ? Stream.fromReadableStream(() => this.source.body as any, (_) =>
        Error.RequestError({
          request: this,
          reason: "Decode",
          error: _
        }))
      : Stream.fail(Error.RequestError({
        request: this,
        reason: "Decode",
        error: "can not create stream from empty body"
      }))
  }

  private textEffect: Effect.Effect<never, Error.RequestError, string> | undefined
  get text(): Effect.Effect<never, Error.RequestError, string> {
    if (this.textEffect) {
      return this.textEffect
    }
    this.textEffect = Effect.runSync(Effect.cached(
      Effect.tryPromise({
        try: () => this.source.text(),
        catch: (error) =>
          Error.RequestError({
            request: this,
            reason: "Decode",
            error
          })
      })
    ))
    return this.textEffect
  }

  get json(): Effect.Effect<never, Error.RequestError, unknown> {
    return Effect.tryMap(this.text, {
      try: (_) => JSON.parse(_) as unknown,
      catch: (error) =>
        Error.RequestError({
          request: this,
          reason: "Decode",
          error
        })
    })
  }

  get urlParamsBody(): Effect.Effect<never, Error.RequestError, UrlParams.UrlParams> {
    return Effect.flatMap(this.text, (_) =>
      Effect.try({
        try: () => UrlParams.fromInput(new URLSearchParams(_)),
        catch: (error) =>
          Error.RequestError({
            request: this,
            reason: "Decode",
            error
          })
      }))
  }

  private formDataEffect:
    | Effect.Effect<
      Scope.Scope | FileSystem.FileSystem | Path.Path,
      FormData.FormDataError,
      FormData.PersistedFormData
    >
    | undefined
  get formData(): Effect.Effect<
    Scope.Scope | FileSystem.FileSystem | Path.Path,
    FormData.FormDataError,
    FormData.PersistedFormData
  > {
    if (this.formDataEffect) {
      return this.formDataEffect
    }
    this.formDataEffect = Effect.runSync(Effect.cached(
      FormData.formData(this.formDataStream)
    ))
    return this.formDataEffect
  }

  get formDataStream(): Stream.Stream<never, FormData.FormDataError, FormData.Part> {
    return Stream.pipeThroughChannel(
      Stream.mapError(this.stream, (error) => FormData.FormDataError("InternalError", error)),
      FormData.makeChannel(this.headers)
    )
  }

  private arrayBufferEffect: Effect.Effect<never, Error.RequestError, ArrayBuffer> | undefined
  get arrayBuffer(): Effect.Effect<never, Error.RequestError, ArrayBuffer> {
    if (this.arrayBuffer) {
      return this.arrayBuffer
    }
    this.arrayBufferEffect = Effect.runSync(Effect.cached(
      Effect.tryPromise({
        try: () => this.source.arrayBuffer(),
        catch: (error) =>
          Error.RequestError({
            request: this,
            reason: "Decode",
            error
          })
      })
    ))
    return this.arrayBufferEffect
  }
}
