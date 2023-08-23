import { dual, pipe } from "@effect/data/Function"
import { pipeArguments } from "@effect/data/Pipeable"
import * as Effect from "@effect/io/Effect"
import type * as PlatformError from "@effect/platform/Error"
import * as FileSystem from "@effect/platform/FileSystem"
import type * as Body from "@effect/platform/Http/Body"
import * as Etag from "@effect/platform/Http/Etag"
import * as Headers from "@effect/platform/Http/Headers"
import type * as Error from "@effect/platform/Http/ServerError"
import * as ServerRequest from "@effect/platform/Http/ServerRequest"
import type * as ServerResponse from "@effect/platform/Http/ServerResponse"
import * as UrlParams from "@effect/platform/Http/UrlParams"
import * as internalBody from "@effect/platform/internal/http/body"
import * as internalError from "@effect/platform/internal/http/serverError"
import type * as Schema from "@effect/schema/Schema"
import type * as Stream from "@effect/stream/Stream"

/** @internal */
export const TypeId: ServerResponse.TypeId = Symbol.for("@effect/platform/Http/ServerResponse") as ServerResponse.TypeId

class ServerResponseImpl implements ServerResponse.ServerResponse {
  readonly [TypeId]: ServerResponse.TypeId
  readonly headers: Headers.Headers
  constructor(
    readonly status: number,
    readonly statusText: string | undefined,
    headers: Headers.Headers,
    readonly body: Body.Body
  ) {
    this[TypeId] = TypeId
    if (body.contentType || body.contentLength) {
      const newHeaders = { ...headers }
      if (body.contentType) {
        newHeaders["content-type"] = body.contentType
      }
      if (body.contentLength) {
        newHeaders["content-length"] = body.contentLength.toString()
      }
      this.headers = newHeaders
    } else {
      this.headers = headers
    }
  }
  pipe() {
    return pipeArguments(this, arguments)
  }
}

/** @internal */
export const isServerResponse = (u: unknown): u is ServerResponse.ServerResponse =>
  typeof u === "object" && u !== null && TypeId in u

/** @internal */
export const toNonEffectBody = (
  self: ServerResponse.ServerResponse
): Effect.Effect<ServerRequest.ServerRequest, Error.ResponseError, ServerResponse.ServerResponse.NonEffectBody> =>
  self.body._tag === "Effect" ?
    Effect.map(
      Effect.catchAll(self.body.effect, (error) =>
        Effect.flatMap(
          ServerRequest.ServerRequest,
          (request) =>
            Effect.fail(
              internalError.responseError({
                reason: "Decode",
                request,
                response: self,
                error
              })
            )
        )),
      (body) => setBody(self, body) as ServerResponse.ServerResponse.NonEffectBody
    ) :
    Effect.succeed(self as ServerResponse.ServerResponse.NonEffectBody)

/** @internal */
export const empty = (options?: ServerResponse.Options.WithContent): ServerResponse.ServerResponse =>
  new ServerResponseImpl(
    options?.status ?? 204,
    options?.statusText,
    options?.headers ?? Headers.empty,
    internalBody.empty
  )

/** @internal */
export const uint8Array = (
  body: Uint8Array,
  options?: ServerResponse.Options.WithContentType
): ServerResponse.ServerResponse =>
  new ServerResponseImpl(
    options?.status ?? 200,
    options?.statusText,
    options?.headers ?? Headers.empty,
    internalBody.uint8Array(body, getContentType(options))
  )

/** @internal */
export const text = (body: string, options?: ServerResponse.Options.WithContentType): ServerResponse.ServerResponse =>
  new ServerResponseImpl(
    options?.status ?? 200,
    options?.statusText,
    options?.headers ?? Headers.empty,
    internalBody.text(body, getContentType(options))
  )

/** @internal */
export const json = (body: unknown, options?: ServerResponse.Options.WithContent): ServerResponse.ServerResponse =>
  new ServerResponseImpl(
    options?.status ?? 200,
    options?.statusText,
    options?.headers ?? Headers.empty,
    internalBody.json(body)
  )

/** @internal */
export const unsafeJson = (
  body: unknown,
  options?: ServerResponse.Options.WithContent
): ServerResponse.ServerResponse =>
  new ServerResponseImpl(
    options?.status ?? 200,
    options?.statusText,
    options?.headers ?? Headers.empty,
    internalBody.unsafeJson(body)
  )

/** @internal */
export const schemaJson = <I, A>(
  schema: Schema.Schema<I, A>
) => {
  const encode = internalBody.jsonSchema(schema)
  return (body: A, options?: ServerResponse.Options.WithContent): ServerResponse.ServerResponse =>
    new ServerResponseImpl(
      options?.status ?? 200,
      options?.statusText,
      options?.headers ?? Headers.empty,
      encode(body)
    )
}

/** @internal */
export const file = (
  path: string,
  options?: ServerResponse.Options & FileSystem.StreamOptions
): Effect.Effect<
  FileSystem.FileSystem | Etag.Generator,
  PlatformError.PlatformError,
  ServerResponse.ServerResponse
> =>
  pipe(
    Effect.bindTo(Effect.flatMap(FileSystem.FileSystem, (fs) => fs.stat(path)), "info"),
    Effect.bind("etag", ({ info }) =>
      Effect.flatMap(
        Etag.Generator,
        (generator) => generator.fromFileInfo(info)
      )),
    Effect.bind("body", ({ info }) => internalBody.fileInfo(path, info, options)),
    Effect.map(({ body, etag, info }) => {
      const headers: Record<string, string> = {
        ...(options?.headers ?? {}),
        etag: Etag.toString(etag)
      }
      if (info.mtime._tag === "Some") {
        headers["last-modified"] = info.mtime.value.toUTCString()
      }
      return new ServerResponseImpl(
        options?.status ?? 200,
        options?.statusText,
        headers,
        body
      )
    })
  )

/** @internal */
export const urlParams = (
  body: UrlParams.Input,
  options?: ServerResponse.Options.WithContent
): ServerResponse.ServerResponse =>
  new ServerResponseImpl(
    options?.status ?? 200,
    options?.statusText,
    options?.headers ?? Headers.empty,
    internalBody.text(UrlParams.toString(UrlParams.fromInput(body)), "application/x-www-form-urlencoded")
  )

/** @internal */
export const effect = (
  body: Effect.Effect<never, unknown, Body.NonEffect>,
  options?: ServerResponse.Options.WithContent
): ServerResponse.ServerResponse =>
  new ServerResponseImpl(
    options?.status ?? 200,
    options?.statusText,
    options?.headers ?? Headers.empty,
    internalBody.effect(body)
  )

/** @internal */
export const raw = (body: unknown, options?: ServerResponse.Options): ServerResponse.ServerResponse =>
  new ServerResponseImpl(
    options?.status ?? 200,
    options?.statusText,
    options?.headers ?? Headers.empty,
    internalBody.raw(body)
  )

/** @internal */
export const formData = (body: FormData, options?: ServerResponse.Options.WithContent): ServerResponse.ServerResponse =>
  new ServerResponseImpl(
    options?.status ?? 200,
    options?.statusText,
    options?.headers ?? Headers.empty,
    internalBody.formData(body)
  )

/** @internal */
export const stream = (
  body: Stream.Stream<never, unknown, Uint8Array>,
  options?: ServerResponse.Options
): ServerResponse.ServerResponse =>
  new ServerResponseImpl(
    options?.status ?? 200,
    options?.statusText,
    options?.headers ?? Headers.empty,
    internalBody.stream(body, getContentType(options), options?.contentLength)
  )

/** @internal */
export const getContentType = (options?: ServerResponse.Options): string | undefined => {
  if (options?.contentType) {
    return options.contentType
  } else if (options?.headers) {
    return options.headers["content-type"]
  } else {
    return
  }
}

/** @internal */
export const setHeader = dual<
  (key: string, value: string) => (self: ServerResponse.ServerResponse) => ServerResponse.ServerResponse,
  (self: ServerResponse.ServerResponse, key: string, value: string) => ServerResponse.ServerResponse
>(3, (self, key, value) =>
  new ServerResponseImpl(
    self.status,
    self.statusText,
    Headers.set(self.headers, key, value),
    self.body
  ))

/** @internal */
export const setHeaders = dual<
  (input: Headers.Input) => (self: ServerResponse.ServerResponse) => ServerResponse.ServerResponse,
  (self: ServerResponse.ServerResponse, input: Headers.Input) => ServerResponse.ServerResponse
>(2, (self, input) =>
  new ServerResponseImpl(
    self.status,
    self.statusText,
    Headers.setAll(self.headers, input),
    self.body
  ))

/** @internal */
export const setStatus = dual<
  (status: number, statusText?: string) => (self: ServerResponse.ServerResponse) => ServerResponse.ServerResponse,
  (self: ServerResponse.ServerResponse, status: number, statusText?: string) => ServerResponse.ServerResponse
>((args) => isServerResponse(args[0]), (self, status, statusText) =>
  new ServerResponseImpl(
    status,
    statusText,
    self.headers,
    self.body
  ))

/** @internal */
export const setBody = dual<
  (body: Body.Body) => (self: ServerResponse.ServerResponse) => ServerResponse.ServerResponse,
  (self: ServerResponse.ServerResponse, body: Body.Body) => ServerResponse.ServerResponse
>(2, (self, body) => {
  let headers = self.headers
  if (body._tag === "Empty") {
    headers = Headers.remove(Headers.remove(headers, "Content-Type"), "Content-length")
  }
  return new ServerResponseImpl(
    self.status,
    self.statusText,
    headers,
    body
  )
})
