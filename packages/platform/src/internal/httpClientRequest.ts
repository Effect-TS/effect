import * as Effect from "effect/Effect"
import * as Either from "effect/Either"
import { dual } from "effect/Function"
import * as Inspectable from "effect/Inspectable"
import * as Option from "effect/Option"
import { pipeArguments } from "effect/Pipeable"
import * as Redacted from "effect/Redacted"
import type * as Schema from "effect/Schema"
import type { ParseOptions } from "effect/SchemaAST"
import type * as Stream from "effect/Stream"
import type * as PlatformError from "../Error.js"
import type * as FileSystem from "../FileSystem.js"
import * as Headers from "../Headers.js"
import type * as Body from "../HttpBody.js"
import type * as ClientRequest from "../HttpClientRequest.js"
import type { HttpMethod } from "../HttpMethod.js"
import * as UrlParams from "../UrlParams.js"
import * as internalBody from "./httpBody.js"

/** @internal */
export const TypeId: ClientRequest.TypeId = Symbol.for("@effect/platform/HttpClientRequest") as ClientRequest.TypeId

const Proto = {
  [TypeId]: TypeId,
  ...Inspectable.BaseProto,
  toJSON(this: ClientRequest.HttpClientRequest): unknown {
    return {
      _id: "@effect/platform/HttpClientRequest",
      method: this.method,
      url: this.url,
      urlParams: this.urlParams,
      hash: this.hash,
      headers: Inspectable.redact(this.headers),
      body: this.body.toJSON()
    }
  },
  pipe() {
    return pipeArguments(this, arguments)
  }
}

function makeInternal(
  method: HttpMethod,
  url: string,
  urlParams: UrlParams.UrlParams,
  hash: Option.Option<string>,
  headers: Headers.Headers,
  body: Body.HttpBody
): ClientRequest.HttpClientRequest {
  const self = Object.create(Proto)
  self.method = method
  self.url = url
  self.urlParams = urlParams
  self.hash = hash
  self.headers = headers
  self.body = body
  return self
}

/** @internal */
export const isClientRequest = (u: unknown): u is ClientRequest.HttpClientRequest =>
  typeof u === "object" && u !== null && TypeId in u

/** @internal */
export const empty: ClientRequest.HttpClientRequest = makeInternal(
  "GET",
  "",
  UrlParams.empty,
  Option.none(),
  Headers.empty,
  internalBody.empty
)

/** @internal */
export const make = <M extends HttpMethod>(method: M) =>
(
  url: string | URL,
  options?: M extends "GET" | "HEAD" ? ClientRequest.Options.NoBody : ClientRequest.Options.NoUrl
) =>
  modify(empty, {
    method,
    url,
    ...(options ?? undefined)
  })

/** @internal */
export const get = make("GET")

/** @internal */
export const post = make("POST")

/** @internal */
export const put = make("PUT")

/** @internal */
export const patch = make("PATCH")

/** @internal */
export const del = make("DELETE")

/** @internal */
export const head = make("HEAD")

/** @internal */
export const options = make("OPTIONS")

/** @internal */
export const modify = dual<
  (options: ClientRequest.Options) => (self: ClientRequest.HttpClientRequest) => ClientRequest.HttpClientRequest,
  (self: ClientRequest.HttpClientRequest, options: ClientRequest.Options) => ClientRequest.HttpClientRequest
>(2, (self, options) => {
  let result = self

  if (options.method) {
    result = setMethod(result, options.method)
  }
  if (options.url) {
    result = setUrl(result, options.url)
  }
  if (options.headers) {
    result = setHeaders(result, options.headers)
  }
  if (options.urlParams) {
    result = setUrlParams(result, options.urlParams)
  }
  if (options.hash) {
    result = setHash(result, options.hash)
  }
  if (options.body) {
    result = setBody(result, options.body)
  }
  if (options.accept) {
    result = accept(result, options.accept)
  }
  if (options.acceptJson) {
    result = acceptJson(result)
  }

  return result
})

/** @internal */
export const setHeader = dual<
  (key: string, value: string) => (self: ClientRequest.HttpClientRequest) => ClientRequest.HttpClientRequest,
  (self: ClientRequest.HttpClientRequest, key: string, value: string) => ClientRequest.HttpClientRequest
>(3, (self, key, value) =>
  makeInternal(
    self.method,
    self.url,
    self.urlParams,
    self.hash,
    Headers.set(self.headers, key, value),
    self.body
  ))

/** @internal */
export const setHeaders = dual<
  (input: Headers.Input) => (self: ClientRequest.HttpClientRequest) => ClientRequest.HttpClientRequest,
  (self: ClientRequest.HttpClientRequest, input: Headers.Input) => ClientRequest.HttpClientRequest
>(2, (self, input) =>
  makeInternal(
    self.method,
    self.url,
    self.urlParams,
    self.hash,
    Headers.setAll(self.headers, input),
    self.body
  ))

const stringOrRedacted = (value: string | Redacted.Redacted): string =>
  typeof value === "string" ? value : Redacted.value(value)

/** @internal */
export const basicAuth = dual<
  (
    username: string | Redacted.Redacted,
    password: string | Redacted.Redacted
  ) => (self: ClientRequest.HttpClientRequest) => ClientRequest.HttpClientRequest,
  (
    self: ClientRequest.HttpClientRequest,
    username: string | Redacted.Redacted,
    password: string | Redacted.Redacted
  ) => ClientRequest.HttpClientRequest
>(
  3,
  (self, username, password) =>
    setHeader(self, "Authorization", `Basic ${btoa(`${stringOrRedacted(username)}:${stringOrRedacted(password)}`)}`)
)

/** @internal */
export const bearerToken = dual<
  (token: string | Redacted.Redacted) => (self: ClientRequest.HttpClientRequest) => ClientRequest.HttpClientRequest,
  (self: ClientRequest.HttpClientRequest, token: string | Redacted.Redacted) => ClientRequest.HttpClientRequest
>(2, (self, token) => setHeader(self, "Authorization", `Bearer ${stringOrRedacted(token)}`))

/** @internal */
export const accept = dual<
  (mediaType: string) => (self: ClientRequest.HttpClientRequest) => ClientRequest.HttpClientRequest,
  (self: ClientRequest.HttpClientRequest, mediaType: string) => ClientRequest.HttpClientRequest
>(2, (self, mediaType) => setHeader(self, "Accept", mediaType))

/** @internal */
export const acceptJson = accept("application/json")

/** @internal */
export const setMethod = dual<
  (method: HttpMethod) => (self: ClientRequest.HttpClientRequest) => ClientRequest.HttpClientRequest,
  (self: ClientRequest.HttpClientRequest, method: HttpMethod) => ClientRequest.HttpClientRequest
>(2, (self, method) =>
  makeInternal(
    method,
    self.url,
    self.urlParams,
    self.hash,
    self.headers,
    self.body
  ))

/** @internal */
export const setUrl = dual<
  (url: string | URL) => (self: ClientRequest.HttpClientRequest) => ClientRequest.HttpClientRequest,
  (self: ClientRequest.HttpClientRequest, url: string | URL) => ClientRequest.HttpClientRequest
>(2, (self, url) => {
  if (typeof url === "string") {
    return makeInternal(
      self.method,
      url,
      self.urlParams,
      self.hash,
      self.headers,
      self.body
    )
  }
  const clone = new URL(url.toString())
  const urlParams = UrlParams.fromInput(clone.searchParams)
  const hash = clone.hash ? Option.some(clone.hash.slice(1)) : Option.none()
  clone.search = ""
  clone.hash = ""
  return makeInternal(
    self.method,
    clone.toString(),
    urlParams,
    hash,
    self.headers,
    self.body
  )
})

/** @internal */
export const appendUrl = dual<
  (path: string) => (self: ClientRequest.HttpClientRequest) => ClientRequest.HttpClientRequest,
  (self: ClientRequest.HttpClientRequest, path: string) => ClientRequest.HttpClientRequest
>(2, (self, url) =>
  makeInternal(
    self.method,
    self.url.endsWith("/") && url.startsWith("/") ?
      self.url + url.slice(1) :
      self.url + url,
    self.urlParams,
    self.hash,
    self.headers,
    self.body
  ))

/** @internal */
export const prependUrl = dual<
  (path: string) => (self: ClientRequest.HttpClientRequest) => ClientRequest.HttpClientRequest,
  (self: ClientRequest.HttpClientRequest, path: string) => ClientRequest.HttpClientRequest
>(2, (self, url) =>
  makeInternal(
    self.method,
    url.endsWith("/") && self.url.startsWith("/") ?
      url + self.url.slice(1) :
      url + self.url,
    self.urlParams,
    self.hash,
    self.headers,
    self.body
  ))

/** @internal */
export const updateUrl = dual<
  (f: (url: string) => string) => (self: ClientRequest.HttpClientRequest) => ClientRequest.HttpClientRequest,
  (self: ClientRequest.HttpClientRequest, f: (url: string) => string) => ClientRequest.HttpClientRequest
>(2, (self, f) =>
  makeInternal(
    self.method,
    f(self.url),
    self.urlParams,
    self.hash,
    self.headers,
    self.body
  ))

/** @internal */
export const appendUrlParam = dual<
  (key: string, value: string) => (self: ClientRequest.HttpClientRequest) => ClientRequest.HttpClientRequest,
  (self: ClientRequest.HttpClientRequest, key: string, value: string) => ClientRequest.HttpClientRequest
>(3, (self, key, value) =>
  makeInternal(
    self.method,
    self.url,
    UrlParams.append(self.urlParams, key, value),
    self.hash,
    self.headers,
    self.body
  ))

/** @internal */
export const appendUrlParams = dual<
  (input: UrlParams.Input) => (self: ClientRequest.HttpClientRequest) => ClientRequest.HttpClientRequest,
  (self: ClientRequest.HttpClientRequest, input: UrlParams.Input) => ClientRequest.HttpClientRequest
>(2, (self, input) =>
  makeInternal(
    self.method,
    self.url,
    UrlParams.appendAll(self.urlParams, input),
    self.hash,
    self.headers,
    self.body
  ))

/** @internal */
export const setUrlParam = dual<
  (key: string, value: string) => (self: ClientRequest.HttpClientRequest) => ClientRequest.HttpClientRequest,
  (self: ClientRequest.HttpClientRequest, key: string, value: string) => ClientRequest.HttpClientRequest
>(3, (self, key, value) =>
  makeInternal(
    self.method,
    self.url,
    UrlParams.set(self.urlParams, key, value),
    self.hash,
    self.headers,
    self.body
  ))

/** @internal */
export const setUrlParams = dual<
  (input: UrlParams.Input) => (self: ClientRequest.HttpClientRequest) => ClientRequest.HttpClientRequest,
  (self: ClientRequest.HttpClientRequest, input: UrlParams.Input) => ClientRequest.HttpClientRequest
>(2, (self, input) =>
  makeInternal(
    self.method,
    self.url,
    UrlParams.setAll(self.urlParams, input),
    self.hash,
    self.headers,
    self.body
  ))

/** @internal */
export const setHash = dual<
  (hash: string) => (self: ClientRequest.HttpClientRequest) => ClientRequest.HttpClientRequest,
  (self: ClientRequest.HttpClientRequest, hash: string) => ClientRequest.HttpClientRequest
>(2, (self, hash) =>
  makeInternal(
    self.method,
    self.url,
    self.urlParams,
    Option.some(hash),
    self.headers,
    self.body
  ))

/** @internal */
export const removeHash = (self: ClientRequest.HttpClientRequest): ClientRequest.HttpClientRequest =>
  makeInternal(
    self.method,
    self.url,
    self.urlParams,
    Option.none(),
    self.headers,
    self.body
  )

/** @internal */
export const toUrl = (self: ClientRequest.HttpClientRequest): Option.Option<URL> =>
  Either.getRight(UrlParams.makeUrl(self.url, self.urlParams, self.hash))

/** @internal */
export const setBody = dual<
  (body: Body.HttpBody) => (self: ClientRequest.HttpClientRequest) => ClientRequest.HttpClientRequest,
  (self: ClientRequest.HttpClientRequest, body: Body.HttpBody) => ClientRequest.HttpClientRequest
>(2, (self, body) => {
  let headers = self.headers
  if (body._tag === "Empty" || body._tag === "FormData") {
    headers = Headers.remove(headers, ["Content-type", "Content-length"])
  } else {
    const contentType = body.contentType
    if (contentType) {
      headers = Headers.set(headers, "content-type", contentType)
    }

    const contentLength = body.contentLength
    if (contentLength) {
      headers = Headers.set(headers, "content-length", contentLength.toString())
    }
  }
  return makeInternal(
    self.method,
    self.url,
    self.urlParams,
    self.hash,
    headers,
    body
  )
})

/** @internal */
export const bodyUint8Array = dual<
  (
    body: Uint8Array,
    contentType?: string
  ) => (self: ClientRequest.HttpClientRequest) => ClientRequest.HttpClientRequest,
  (self: ClientRequest.HttpClientRequest, body: Uint8Array, contentType?: string) => ClientRequest.HttpClientRequest
>(
  (args) => isClientRequest(args[0]),
  (self, body, contentType = "application/octet-stream") => setBody(self, internalBody.uint8Array(body, contentType))
)

/** @internal */
export const bodyText = dual<
  (body: string, contentType?: string) => (self: ClientRequest.HttpClientRequest) => ClientRequest.HttpClientRequest,
  (self: ClientRequest.HttpClientRequest, body: string, contentType?: string) => ClientRequest.HttpClientRequest
>(
  (args) => isClientRequest(args[0]),
  (self, body, contentType = "text/plain") => setBody(self, internalBody.text(body, contentType))
)

/** @internal */
export const bodyJson = dual<
  (
    body: unknown
  ) => (self: ClientRequest.HttpClientRequest) => Effect.Effect<ClientRequest.HttpClientRequest, Body.HttpBodyError>,
  (
    self: ClientRequest.HttpClientRequest,
    body: unknown
  ) => Effect.Effect<ClientRequest.HttpClientRequest, Body.HttpBodyError>
>(2, (self, body) => Effect.map(internalBody.json(body), (body) => setBody(self, body)))

/** @internal */
export const bodyUnsafeJson = dual<
  (body: unknown) => (self: ClientRequest.HttpClientRequest) => ClientRequest.HttpClientRequest,
  (self: ClientRequest.HttpClientRequest, body: unknown) => ClientRequest.HttpClientRequest
>(2, (self, body) => setBody(self, internalBody.unsafeJson(body)))

/** @internal */
export const bodyFile = dual<
  (
    path: string,
    options?: FileSystem.StreamOptions & { readonly contentType?: string }
  ) => (
    self: ClientRequest.HttpClientRequest
  ) => Effect.Effect<ClientRequest.HttpClientRequest, PlatformError.PlatformError, FileSystem.FileSystem>,
  (
    self: ClientRequest.HttpClientRequest,
    path: string,
    options?: FileSystem.StreamOptions & { readonly contentType?: string }
  ) => Effect.Effect<ClientRequest.HttpClientRequest, PlatformError.PlatformError, FileSystem.FileSystem>
>(
  (args) => isClientRequest(args[0]),
  (self, path, options) => Effect.map(internalBody.file(path, options), (body) => setBody(self, body))
)

/** @internal */
export const bodyFileWeb = dual<
  (file: Body.HttpBody.FileLike) => (self: ClientRequest.HttpClientRequest) => ClientRequest.HttpClientRequest,
  (self: ClientRequest.HttpClientRequest, file: Body.HttpBody.FileLike) => ClientRequest.HttpClientRequest
>(2, (self, file) => setBody(self, internalBody.fileWeb(file)))

/** @internal */
export const schemaBodyJson = <A, I, R>(schema: Schema.Schema<A, I, R>, options?: ParseOptions | undefined): {
  (
    body: A
  ): (self: ClientRequest.HttpClientRequest) => Effect.Effect<ClientRequest.HttpClientRequest, Body.HttpBodyError, R>
  (
    self: ClientRequest.HttpClientRequest,
    body: A
  ): Effect.Effect<ClientRequest.HttpClientRequest, Body.HttpBodyError, R>
} => {
  const encode = internalBody.jsonSchema(schema, options)
  return dual<
    (
      body: A
    ) => (
      self: ClientRequest.HttpClientRequest
    ) => Effect.Effect<ClientRequest.HttpClientRequest, Body.HttpBodyError, R>,
    (
      self: ClientRequest.HttpClientRequest,
      body: A
    ) => Effect.Effect<ClientRequest.HttpClientRequest, Body.HttpBodyError, R>
  >(2, (self, body) => Effect.map(encode(body), (body) => setBody(self, body)))
}

/** @internal */
export const bodyUrlParams = dual<
  (input: UrlParams.Input) => (self: ClientRequest.HttpClientRequest) => ClientRequest.HttpClientRequest,
  (self: ClientRequest.HttpClientRequest, input: UrlParams.Input) => ClientRequest.HttpClientRequest
>(2, (self, body) =>
  setBody(
    self,
    internalBody.text(
      UrlParams.toString(UrlParams.fromInput(body)),
      "application/x-www-form-urlencoded"
    )
  ))

/** @internal */
export const bodyFormData = dual<
  (body: FormData) => (self: ClientRequest.HttpClientRequest) => ClientRequest.HttpClientRequest,
  (self: ClientRequest.HttpClientRequest, body: FormData) => ClientRequest.HttpClientRequest
>(2, (self, body) => setBody(self, internalBody.formData(body)))

/** @internal */
export const bodyFormDataRecord = dual<
  (entries: Body.FormDataInput) => (self: ClientRequest.HttpClientRequest) => ClientRequest.HttpClientRequest,
  (self: ClientRequest.HttpClientRequest, entries: Body.FormDataInput) => ClientRequest.HttpClientRequest
>(2, (self, entries) => setBody(self, internalBody.formDataRecord(entries)))

/** @internal */
export const bodyStream = dual<
  (
    body: Stream.Stream<Uint8Array, unknown>,
    options?: {
      readonly contentType?: string | undefined
      readonly contentLength?: number | undefined
    }
  ) => (self: ClientRequest.HttpClientRequest) => ClientRequest.HttpClientRequest,
  (
    self: ClientRequest.HttpClientRequest,
    body: Stream.Stream<Uint8Array, unknown>,
    options?: {
      readonly contentType?: string | undefined
      readonly contentLength?: number | undefined
    }
  ) => ClientRequest.HttpClientRequest
>(
  (args) => isClientRequest(args[0]),
  (self, body, { contentLength, contentType = "application/octet-stream" } = {}) =>
    setBody(self, internalBody.stream(body, contentType, contentLength))
)
