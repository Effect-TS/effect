import type { ParseOptions } from "@effect/schema/AST"
import type * as Schema from "@effect/schema/Schema"
import * as Effect from "effect/Effect"
import * as Effectable from "effect/Effectable"
import { dual } from "effect/Function"
import * as Inspectable from "effect/Inspectable"
import * as Stream from "effect/Stream"
import type * as PlatformError from "../../Error.js"
import type * as FileSystem from "../../FileSystem.js"
import type * as Body from "../../Http/Body.js"
import * as Cookies from "../../Http/Cookies.js"
import * as Headers from "../../Http/Headers.js"
import * as Platform from "../../Http/Platform.js"
import type * as ServerResponse from "../../Http/ServerResponse.js"
import * as UrlParams from "../../Http/UrlParams.js"
import * as Template from "../../Template.js"
import * as internalBody from "./body.js"

/** @internal */
export const TypeId: ServerResponse.TypeId = Symbol.for("@effect/platform/Http/ServerResponse") as ServerResponse.TypeId

class ServerResponseImpl extends Effectable.StructuralClass<ServerResponse.ServerResponse>
  implements ServerResponse.ServerResponse
{
  readonly [TypeId]: ServerResponse.TypeId
  readonly headers: Headers.Headers
  constructor(
    readonly status: number,
    readonly statusText: string | undefined,
    headers: Headers.Headers,
    readonly cookies: Cookies.Cookies,
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

  commit(): Effect.Effect<ServerResponse.ServerResponse> {
    return Effect.succeed(this)
  }

  [Inspectable.NodeInspectSymbol]() {
    return this.toJSON()
  }

  toString(): string {
    return Inspectable.format(this)
  }

  toJSON() {
    return {
      _id: "@effect/platform/Http/ServerResponse",
      status: this.status,
      statusText: this.statusText,
      headers: this.headers,
      body: this.body.toJSON()
    }
  }
}

/** @internal */
export const isServerResponse = (u: unknown): u is ServerResponse.ServerResponse =>
  typeof u === "object" && u !== null && TypeId in u

/** @internal */
export const empty = (options?: ServerResponse.Options.WithContent | undefined): ServerResponse.ServerResponse =>
  new ServerResponseImpl(
    options?.status ?? 204,
    options?.statusText,
    options?.headers ?? Headers.empty,
    options?.cookies ?? Cookies.empty,
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
    options?.cookies ?? Cookies.empty,
    internalBody.uint8Array(body, getContentType(options))
  )

/** @internal */
export const text = (body: string, options?: ServerResponse.Options.WithContentType): ServerResponse.ServerResponse =>
  new ServerResponseImpl(
    options?.status ?? 200,
    options?.statusText,
    options?.headers ?? Headers.empty,
    options?.cookies ?? Cookies.empty,
    internalBody.text(body, getContentType(options))
  )

/** @internal */
export const html: {
  <A extends ReadonlyArray<Template.Interpolated>>(
    strings: TemplateStringsArray,
    ...args: A
  ): Effect.Effect<
    ServerResponse.ServerResponse,
    Template.Interpolated.Error<A[number]>,
    Template.Interpolated.Context<A[number]>
  >
  (html: string): ServerResponse.ServerResponse
} = (
  strings: TemplateStringsArray | string,
  ...args: ReadonlyArray<Template.Interpolated>
) => {
  if (typeof strings === "string") {
    return text(strings, { contentType: "text/html" })
  }

  return Effect.map(
    Template.make(strings, ...args),
    (_) => text(_, { contentType: "text/html" })
  ) as any
}

/** @internal */
export const htmlStream = <A extends ReadonlyArray<Template.InterpolatedWithStream>>(
  strings: TemplateStringsArray,
  ...args: A
): Effect.Effect<
  ServerResponse.ServerResponse,
  never,
  Template.Interpolated.Context<A[number]>
> =>
  Effect.map(
    Effect.context<any>(),
    (context) =>
      stream(
        Stream.provideContext(
          Stream.encodeText(Template.stream(strings, ...args)),
          context
        ),
        { contentType: "text/html" }
      )
  )

/** @internal */
export const json = (
  body: unknown,
  options?: ServerResponse.Options.WithContent | undefined
): Effect.Effect<ServerResponse.ServerResponse, Body.BodyError> =>
  Effect.map(internalBody.json(body), (body) =>
    new ServerResponseImpl(
      options?.status ?? 200,
      options?.statusText,
      options?.headers ?? Headers.empty,
      options?.cookies ?? Cookies.empty,
      body
    ))

/** @internal */
export const unsafeJson = (
  body: unknown,
  options?: ServerResponse.Options.WithContent | undefined
): ServerResponse.ServerResponse =>
  new ServerResponseImpl(
    options?.status ?? 200,
    options?.statusText,
    options?.headers ?? Headers.empty,
    options?.cookies ?? Cookies.empty,
    internalBody.unsafeJson(body)
  )

/** @internal */
export const schemaJson = <A, I, R>(
  schema: Schema.Schema<A, I, R>,
  options?: ParseOptions | undefined
) => {
  const encode = internalBody.jsonSchema(schema, options)
  return (
    body: A,
    options?: ServerResponse.Options.WithContent | undefined
  ): Effect.Effect<ServerResponse.ServerResponse, Body.BodyError, R> =>
    Effect.map(encode(body), (body) =>
      new ServerResponseImpl(
        options?.status ?? 200,
        options?.statusText,
        options?.headers ?? Headers.empty,
        options?.cookies ?? Cookies.empty,
        body
      ))
}

/** @internal */
export const file = (
  path: string,
  options?: (ServerResponse.Options & FileSystem.StreamOptions) | undefined
): Effect.Effect<ServerResponse.ServerResponse, PlatformError.PlatformError, Platform.Platform> =>
  Effect.flatMap(
    Platform.Platform,
    (platform) => platform.fileResponse(path, options)
  )

/** @internal */
export const fileWeb = (
  file: Body.Body.FileLike,
  options?: (ServerResponse.Options.WithContent & FileSystem.StreamOptions) | undefined
): Effect.Effect<ServerResponse.ServerResponse, never, Platform.Platform> =>
  Effect.flatMap(
    Platform.Platform,
    (platform) => platform.fileWebResponse(file, options)
  )

/** @internal */
export const urlParams = (
  body: UrlParams.Input,
  options?: ServerResponse.Options.WithContent | undefined
): ServerResponse.ServerResponse =>
  new ServerResponseImpl(
    options?.status ?? 200,
    options?.statusText,
    options?.headers ?? Headers.empty,
    options?.cookies ?? Cookies.empty,
    internalBody.text(UrlParams.toString(UrlParams.fromInput(body)), "application/x-www-form-urlencoded")
  )

/** @internal */
export const raw = (body: unknown, options?: ServerResponse.Options | undefined): ServerResponse.ServerResponse =>
  new ServerResponseImpl(
    options?.status ?? 200,
    options?.statusText,
    options?.headers ?? Headers.empty,
    options?.cookies ?? Cookies.empty,
    internalBody.raw(body)
  )

/** @internal */
export const formData = (
  body: FormData,
  options?: ServerResponse.Options.WithContent | undefined
): ServerResponse.ServerResponse =>
  new ServerResponseImpl(
    options?.status ?? 200,
    options?.statusText,
    options?.headers ?? Headers.empty,
    options?.cookies ?? Cookies.empty,
    internalBody.formData(body)
  )

/** @internal */
export const stream = (
  body: Stream.Stream<Uint8Array, unknown>,
  options?: ServerResponse.Options | undefined
): ServerResponse.ServerResponse =>
  new ServerResponseImpl(
    options?.status ?? 200,
    options?.statusText,
    options?.headers ?? Headers.empty,
    options?.cookies ?? Cookies.empty,
    internalBody.stream(body, getContentType(options), options?.contentLength)
  )

/** @internal */
export const getContentType = (options?: ServerResponse.Options | undefined): string | undefined => {
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
    self.cookies,
    self.body
  ))

/** @internal */
export const replaceCookies = dual<
  (cookies: Cookies.Cookies) => (self: ServerResponse.ServerResponse) => ServerResponse.ServerResponse,
  (self: ServerResponse.ServerResponse, cookies: Cookies.Cookies) => ServerResponse.ServerResponse
>(2, (self, cookies) =>
  new ServerResponseImpl(
    self.status,
    self.statusText,
    self.headers,
    cookies,
    self.body
  ))

/** @internal */
export const setCookie = dual<
  (
    name: string,
    value: string,
    options?: Cookies.Cookie["options"]
  ) => (self: ServerResponse.ServerResponse) => Effect.Effect<ServerResponse.ServerResponse, Cookies.CookiesError>,
  (
    self: ServerResponse.ServerResponse,
    name: string,
    value: string,
    options?: Cookies.Cookie["options"]
  ) => Effect.Effect<ServerResponse.ServerResponse, Cookies.CookiesError>
>(
  (args) => Cookies.isCookies(args[0]),
  (self, name, value, options) =>
    Effect.map(Cookies.add(self.cookies, name, value, options), (cookies) =>
      new ServerResponseImpl(
        self.status,
        self.statusText,
        self.headers,
        cookies,
        self.body
      ))
)

/** @internal */
export const unsafeSetCookie = dual<
  (
    name: string,
    value: string,
    options?: Cookies.Cookie["options"]
  ) => (self: ServerResponse.ServerResponse) => ServerResponse.ServerResponse,
  (
    self: ServerResponse.ServerResponse,
    name: string,
    value: string,
    options?: Cookies.Cookie["options"]
  ) => ServerResponse.ServerResponse
>(
  (args) => Cookies.isCookies(args[0]),
  (self, name, value, options) =>
    new ServerResponseImpl(
      self.status,
      self.statusText,
      self.headers,
      Cookies.unsafeAdd(self.cookies, name, value, options),
      self.body
    )
)

/** @internal */
export const updateCookies = dual<
  (
    f: (cookies: Cookies.Cookies) => Cookies.Cookies
  ) => (self: ServerResponse.ServerResponse) => ServerResponse.ServerResponse,
  (
    self: ServerResponse.ServerResponse,
    f: (cookies: Cookies.Cookies) => Cookies.Cookies
  ) => ServerResponse.ServerResponse
>(2, (self, f) =>
  new ServerResponseImpl(
    self.status,
    self.statusText,
    self.headers,
    f(self.cookies),
    self.body
  ))

/** @internal */
export const setCookies = dual<
  (
    cookies: Iterable<readonly [name: string, value: string, options?: Cookies.Cookie["options"]]>
  ) => (self: ServerResponse.ServerResponse) => Effect.Effect<ServerResponse.ServerResponse, Cookies.CookiesError>,
  (
    self: ServerResponse.ServerResponse,
    cookies: Iterable<readonly [name: string, value: string, options?: Cookies.Cookie["options"]]>
  ) => Effect.Effect<ServerResponse.ServerResponse, Cookies.CookiesError>
>(
  2,
  (self, cookies) =>
    Effect.map(Cookies.addAll(self.cookies, cookies), (cookies) =>
      new ServerResponseImpl(
        self.status,
        self.statusText,
        self.headers,
        cookies,
        self.body
      ))
)

/** @internal */
export const unsafeSetCookies = dual<
  (
    cookies: Iterable<readonly [name: string, value: string, options?: Cookies.Cookie["options"]]>
  ) => (self: ServerResponse.ServerResponse) => ServerResponse.ServerResponse,
  (
    self: ServerResponse.ServerResponse,
    cookies: Iterable<readonly [name: string, value: string, options?: Cookies.Cookie["options"]]>
  ) => ServerResponse.ServerResponse
>(
  2,
  (self, cookies) =>
    new ServerResponseImpl(
      self.status,
      self.statusText,
      self.headers,
      Cookies.unsafeAddAll(self.cookies, cookies),
      self.body
    )
)

/** @internal */
export const removeCookie = dual<
  (
    name: string
  ) => (self: ServerResponse.ServerResponse) => ServerResponse.ServerResponse,
  (
    self: ServerResponse.ServerResponse,
    name: string
  ) => ServerResponse.ServerResponse
>(
  2,
  (self, name) =>
    new ServerResponseImpl(
      self.status,
      self.statusText,
      self.headers,
      Cookies.remove(self.cookies, name),
      self.body
    )
)

/** @internal */
export const setHeaders = dual<
  (input: Headers.Input) => (self: ServerResponse.ServerResponse) => ServerResponse.ServerResponse,
  (self: ServerResponse.ServerResponse, input: Headers.Input) => ServerResponse.ServerResponse
>(2, (self, input) =>
  new ServerResponseImpl(
    self.status,
    self.statusText,
    Headers.setAll(self.headers, input),
    self.cookies,
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
    self.cookies,
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
    self.cookies,
    body
  )
})

/** @internal */
export const toWeb = (response: ServerResponse.ServerResponse, withoutBody = false): Response => {
  if (withoutBody) {
    return new Response(undefined, {
      status: response.status,
      statusText: response.statusText as string,
      headers: response.headers
    })
  }
  const body = response.body
  switch (body._tag) {
    case "Empty": {
      return new Response(undefined, {
        status: response.status,
        statusText: response.statusText as string,
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
