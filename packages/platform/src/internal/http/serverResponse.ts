import type * as Schema from "@effect/schema/Schema"
import * as Effect from "effect/Effect"
import * as Effectable from "effect/Effectable"
import { dual } from "effect/Function"
import * as Stream from "effect/Stream"
import type * as PlatformError from "../../Error.js"
import type * as FileSystem from "../../FileSystem.js"
import type * as Body from "../../Http/Body.js"
import * as Headers from "../../Http/Headers.js"
import * as Platform from "../../Http/Platform.js"
import type * as ServerResponse from "../../Http/ServerResponse.js"
import * as UrlParams from "../../Http/UrlParams.js"
import * as internalBody from "./body.js"

/** @internal */
export const TypeId: ServerResponse.TypeId = Symbol.for("@effect/platform/Http/ServerResponse") as ServerResponse.TypeId

class ServerResponseImpl extends Effectable.StructuralClass<never, never, ServerResponse.ServerResponse>
  implements ServerResponse.ServerResponse
{
  readonly [TypeId]: ServerResponse.TypeId
  readonly headers: Headers.Headers
  constructor(
    readonly status: number,
    readonly statusText: string | undefined,
    headers: Headers.Headers,
    readonly body: Body.Body
  ) {
    super()
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

  commit(): Effect.Effect<never, never, ServerResponse.ServerResponse> {
    return Effect.succeed(this)
  }

  toJSON() {
    return {
      _id: "ServerResponse",
      status: this.status,
      statusText: this.statusText,
      headers: this.headers,
      body: this.body
    }
  }
}

/** @internal */
export const isServerResponse = (u: unknown): u is ServerResponse.ServerResponse =>
  typeof u === "object" && u !== null && TypeId in u

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
export const json = (
  body: unknown,
  options?: ServerResponse.Options.WithContent
): Effect.Effect<never, Body.BodyError, ServerResponse.ServerResponse> =>
  Effect.map(internalBody.json(body), (body) =>
    new ServerResponseImpl(
      options?.status ?? 200,
      options?.statusText,
      options?.headers ?? Headers.empty,
      body
    ))

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
  return (
    body: A,
    options?: ServerResponse.Options.WithContent
  ): Effect.Effect<never, Body.BodyError, ServerResponse.ServerResponse> =>
    Effect.map(encode(body), (body) =>
      new ServerResponseImpl(
        options?.status ?? 200,
        options?.statusText,
        options?.headers ?? Headers.empty,
        body
      ))
}

/** @internal */
export const file = (
  path: string,
  options?: ServerResponse.Options & FileSystem.StreamOptions
): Effect.Effect<Platform.Platform, PlatformError.PlatformError, ServerResponse.ServerResponse> =>
  Effect.flatMap(
    Platform.Platform,
    (platform) => platform.fileResponse(path, options)
  )

/** @internal */
export const fileWeb = (
  file: Body.Body.FileLike,
  options?: ServerResponse.Options.WithContent & FileSystem.StreamOptions
): Effect.Effect<Platform.Platform, never, ServerResponse.ServerResponse> =>
  Effect.flatMap(
    Platform.Platform,
    (platform) => platform.fileWebResponse(file, options)
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

/** @internal */
export const toWeb = (response: ServerResponse.ServerResponse, withoutBody = false): Response => {
  if (withoutBody) {
    return new Response(undefined, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers
    })
  }
  const body = response.body
  switch (body._tag) {
    case "Empty": {
      return new Response(undefined, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers
      })
    }
    case "Uint8Array":
    case "Raw": {
      return new Response(body.body as any, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers
      })
    }
    case "FormData": {
      return new Response(body.formData as any, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers
      })
    }
    case "Stream": {
      return new Response(Stream.toReadableStream(body.stream), {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers
      })
    }
  }
}
