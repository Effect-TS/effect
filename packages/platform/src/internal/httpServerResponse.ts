import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Effectable from "effect/Effectable"
import { dual } from "effect/Function"
import * as Inspectable from "effect/Inspectable"
import * as Runtime from "effect/Runtime"
import type * as Schema from "effect/Schema"
import type { ParseOptions } from "effect/SchemaAST"
import * as Stream from "effect/Stream"
import * as Cookies from "../Cookies.js"
import type * as PlatformError from "../Error.js"
import type * as FileSystem from "../FileSystem.js"
import * as Headers from "../Headers.js"
import type * as Body from "../HttpBody.js"
import type * as Platform from "../HttpPlatform.js"
import type * as Respondable from "../HttpServerRespondable.js"
import type * as ServerResponse from "../HttpServerResponse.js"
import * as Template from "../Template.js"
import * as UrlParams from "../UrlParams.js"
import * as internalBody from "./httpBody.js"

/** @internal */
export const TypeId: ServerResponse.TypeId = Symbol.for("@effect/platform/HttpServerResponse") as ServerResponse.TypeId

const respondableSymbol: typeof Respondable.symbol = Symbol.for(
  "@effect/platform/HttpServerRespondable"
) as typeof Respondable.symbol

class ServerResponseImpl extends Effectable.StructuralClass<ServerResponse.HttpServerResponse>
  implements ServerResponse.HttpServerResponse
{
  readonly [TypeId]: ServerResponse.TypeId
  readonly headers: Headers.Headers
  constructor(
    readonly status: number,
    readonly statusText: string | undefined,
    headers: Headers.Headers,
    readonly cookies: Cookies.Cookies,
    readonly body: Body.HttpBody
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

  commit(): Effect.Effect<ServerResponse.HttpServerResponse> {
    return Effect.succeed(this)
  }

  [respondableSymbol](): Effect.Effect<ServerResponse.HttpServerResponse, unknown> {
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
      _id: "@effect/platform/HttpServerResponse",
      status: this.status,
      statusText: this.statusText,
      headers: Inspectable.redact(this.headers),
      cookies: this.cookies.toJSON(),
      body: this.body.toJSON()
    }
  }
}

/** @internal */
export const isServerResponse = (u: unknown): u is ServerResponse.HttpServerResponse =>
  typeof u === "object" && u !== null && TypeId in u

/** @internal */
export const empty = (options?: ServerResponse.Options.WithContent | undefined): ServerResponse.HttpServerResponse =>
  new ServerResponseImpl(
    options?.status ?? 204,
    options?.statusText,
    options?.headers ? Headers.fromInput(options.headers) : Headers.empty,
    options?.cookies ?? Cookies.empty,
    internalBody.empty
  )

/** @internal */
export const redirect = (
  location: string | URL,
  options?: ServerResponse.Options.WithContentType | undefined
): ServerResponse.HttpServerResponse => {
  const headers = Headers.unsafeFromRecord({ location: location.toString() })
  return new ServerResponseImpl(
    options?.status ?? 302,
    options?.statusText,
    options?.headers ?
      Headers.merge(
        headers,
        Headers.fromInput(options.headers)
      ) :
      headers,
    options?.cookies ?? Cookies.empty,
    internalBody.empty
  )
}

/** @internal */
export const uint8Array = (
  body: Uint8Array,
  options?: ServerResponse.Options.WithContentType
): ServerResponse.HttpServerResponse => {
  const headers = options?.headers ? Headers.fromInput(options.headers) : Headers.empty
  return new ServerResponseImpl(
    options?.status ?? 200,
    options?.statusText,
    headers,
    options?.cookies ?? Cookies.empty,
    internalBody.uint8Array(body, getContentType(options, headers))
  )
}

/** @internal */
export const text = (
  body: string,
  options?: ServerResponse.Options.WithContentType
): ServerResponse.HttpServerResponse => {
  const headers = options?.headers ? Headers.fromInput(options.headers) : Headers.empty
  return new ServerResponseImpl(
    options?.status ?? 200,
    options?.statusText,
    headers,
    options?.cookies ?? Cookies.empty,
    internalBody.text(body, getContentType(options, headers))
  )
}

/** @internal */
export const html: {
  <A extends ReadonlyArray<Template.Interpolated>>(
    strings: TemplateStringsArray,
    ...args: A
  ): Effect.Effect<
    ServerResponse.HttpServerResponse,
    Template.Interpolated.Error<A[number]>,
    Template.Interpolated.Context<A[number]>
  >
  (html: string): ServerResponse.HttpServerResponse
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
  ServerResponse.HttpServerResponse,
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
): Effect.Effect<ServerResponse.HttpServerResponse, Body.HttpBodyError> =>
  Effect.map(internalBody.json(body), (body) =>
    new ServerResponseImpl(
      options?.status ?? 200,
      options?.statusText,
      options?.headers ? Headers.fromInput(options.headers) : Headers.empty,
      options?.cookies ?? Cookies.empty,
      body
    ))

/** @internal */
export const unsafeJson = (
  body: unknown,
  options?: ServerResponse.Options.WithContent | undefined
): ServerResponse.HttpServerResponse =>
  new ServerResponseImpl(
    options?.status ?? 200,
    options?.statusText,
    options?.headers ? Headers.fromInput(options.headers) : Headers.empty,
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
  ): Effect.Effect<ServerResponse.HttpServerResponse, Body.HttpBodyError, R> =>
    Effect.map(encode(body), (body) =>
      new ServerResponseImpl(
        options?.status ?? 200,
        options?.statusText,
        options?.headers ? Headers.fromInput(options.headers) : Headers.empty,
        options?.cookies ?? Cookies.empty,
        body
      ))
}

const httpPlatform = Context.GenericTag<Platform.HttpPlatform>("@effect/platform/HttpPlatform")

/** @internal */
export const file = (
  path: string,
  options?: (ServerResponse.Options & FileSystem.StreamOptions) | undefined
): Effect.Effect<ServerResponse.HttpServerResponse, PlatformError.PlatformError, Platform.HttpPlatform> =>
  Effect.flatMap(
    httpPlatform,
    (platform) => platform.fileResponse(path, options)
  )

/** @internal */
export const fileWeb = (
  file: Body.HttpBody.FileLike,
  options?: (ServerResponse.Options.WithContent & FileSystem.StreamOptions) | undefined
): Effect.Effect<ServerResponse.HttpServerResponse, never, Platform.HttpPlatform> =>
  Effect.flatMap(
    httpPlatform,
    (platform) => platform.fileWebResponse(file, options)
  )

/** @internal */
export const urlParams = (
  body: UrlParams.Input,
  options?: ServerResponse.Options.WithContent | undefined
): ServerResponse.HttpServerResponse =>
  new ServerResponseImpl(
    options?.status ?? 200,
    options?.statusText,
    options?.headers ? Headers.fromInput(options.headers) : Headers.empty,
    options?.cookies ?? Cookies.empty,
    internalBody.text(UrlParams.toString(UrlParams.fromInput(body)), "application/x-www-form-urlencoded")
  )

/** @internal */
export const raw = (body: unknown, options?: ServerResponse.Options | undefined): ServerResponse.HttpServerResponse =>
  new ServerResponseImpl(
    options?.status ?? 200,
    options?.statusText,
    options?.headers ? Headers.fromInput(options.headers) : Headers.empty,
    options?.cookies ?? Cookies.empty,
    internalBody.raw(body, {
      contentType: options?.contentType,
      contentLength: options?.contentLength
    })
  )

/** @internal */
export const formData = (
  body: FormData,
  options?: ServerResponse.Options.WithContent | undefined
): ServerResponse.HttpServerResponse =>
  new ServerResponseImpl(
    options?.status ?? 200,
    options?.statusText,
    options?.headers ? Headers.fromInput(options.headers) : Headers.empty,
    options?.cookies ?? Cookies.empty,
    internalBody.formData(body)
  )

/** @internal */
export const stream = <E>(
  body: Stream.Stream<Uint8Array, E>,
  options?: ServerResponse.Options | undefined
): ServerResponse.HttpServerResponse => {
  const headers = options?.headers ? Headers.fromInput(options.headers) : Headers.empty
  return new ServerResponseImpl(
    options?.status ?? 200,
    options?.statusText,
    headers,
    options?.cookies ?? Cookies.empty,
    internalBody.stream(body, getContentType(options, headers), options?.contentLength)
  )
}

/** @internal */
export const getContentType = (
  options: ServerResponse.Options | undefined,
  headers: Headers.Headers
): string | undefined => {
  if (options?.contentType) {
    return options.contentType
  } else if (options?.headers) {
    return headers["content-type"]
  } else {
    return
  }
}

/** @internal */
export const setHeader = dual<
  (key: string, value: string) => (self: ServerResponse.HttpServerResponse) => ServerResponse.HttpServerResponse,
  (self: ServerResponse.HttpServerResponse, key: string, value: string) => ServerResponse.HttpServerResponse
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
  (cookies: Cookies.Cookies) => (self: ServerResponse.HttpServerResponse) => ServerResponse.HttpServerResponse,
  (self: ServerResponse.HttpServerResponse, cookies: Cookies.Cookies) => ServerResponse.HttpServerResponse
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
  ) => (
    self: ServerResponse.HttpServerResponse
  ) => Effect.Effect<ServerResponse.HttpServerResponse, Cookies.CookiesError>,
  (
    self: ServerResponse.HttpServerResponse,
    name: string,
    value: string,
    options?: Cookies.Cookie["options"]
  ) => Effect.Effect<ServerResponse.HttpServerResponse, Cookies.CookiesError>
>(
  (args) => isServerResponse(args[0]),
  (self, name, value, options) =>
    Effect.map(Cookies.set(self.cookies, name, value, options), (cookies) =>
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
  ) => (self: ServerResponse.HttpServerResponse) => ServerResponse.HttpServerResponse,
  (
    self: ServerResponse.HttpServerResponse,
    name: string,
    value: string,
    options?: Cookies.Cookie["options"]
  ) => ServerResponse.HttpServerResponse
>(
  (args) => isServerResponse(args[0]),
  (self, name, value, options) =>
    new ServerResponseImpl(
      self.status,
      self.statusText,
      self.headers,
      Cookies.unsafeSet(self.cookies, name, value, options),
      self.body
    )
)

/** @internal */
export const updateCookies = dual<
  (
    f: (cookies: Cookies.Cookies) => Cookies.Cookies
  ) => (self: ServerResponse.HttpServerResponse) => ServerResponse.HttpServerResponse,
  (
    self: ServerResponse.HttpServerResponse,
    f: (cookies: Cookies.Cookies) => Cookies.Cookies
  ) => ServerResponse.HttpServerResponse
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
  ) => (
    self: ServerResponse.HttpServerResponse
  ) => Effect.Effect<ServerResponse.HttpServerResponse, Cookies.CookiesError>,
  (
    self: ServerResponse.HttpServerResponse,
    cookies: Iterable<readonly [name: string, value: string, options?: Cookies.Cookie["options"]]>
  ) => Effect.Effect<ServerResponse.HttpServerResponse, Cookies.CookiesError>
>(
  2,
  (self, cookies) =>
    Effect.map(Cookies.setAll(self.cookies, cookies), (cookies) =>
      new ServerResponseImpl(
        self.status,
        self.statusText,
        self.headers,
        cookies,
        self.body
      ))
)

/** @internal */
export const mergeCookies = dual<
  (
    cookies: Cookies.Cookies
  ) => (
    self: ServerResponse.HttpServerResponse
  ) => ServerResponse.HttpServerResponse,
  (
    self: ServerResponse.HttpServerResponse,
    cookies: Cookies.Cookies
  ) => ServerResponse.HttpServerResponse
>(
  2,
  (self, cookies) =>
    new ServerResponseImpl(
      self.status,
      self.statusText,
      self.headers,
      Cookies.merge(self.cookies, cookies),
      self.body
    )
)

/** @internal */
export const unsafeSetCookies = dual<
  (
    cookies: Iterable<readonly [name: string, value: string, options?: Cookies.Cookie["options"]]>
  ) => (self: ServerResponse.HttpServerResponse) => ServerResponse.HttpServerResponse,
  (
    self: ServerResponse.HttpServerResponse,
    cookies: Iterable<readonly [name: string, value: string, options?: Cookies.Cookie["options"]]>
  ) => ServerResponse.HttpServerResponse
>(
  2,
  (self, cookies) =>
    new ServerResponseImpl(
      self.status,
      self.statusText,
      self.headers,
      Cookies.unsafeSetAll(self.cookies, cookies),
      self.body
    )
)

/** @internal */
export const removeCookie = dual<
  (
    name: string
  ) => (self: ServerResponse.HttpServerResponse) => ServerResponse.HttpServerResponse,
  (
    self: ServerResponse.HttpServerResponse,
    name: string
  ) => ServerResponse.HttpServerResponse
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
export const expireCookie = dual<
  (
    name: string,
    options?: Omit<Cookies.Cookie["options"], "expires" | "maxAge">
  ) => (self: ServerResponse.HttpServerResponse) => ServerResponse.HttpServerResponse,
  (
    self: ServerResponse.HttpServerResponse,
    name: string,
    options?: Omit<Cookies.Cookie["options"], "expires" | "maxAge">
  ) => ServerResponse.HttpServerResponse
>(
  3,
  (self, name, options) =>
    new ServerResponseImpl(
      self.status,
      self.statusText,
      self.headers,
      Cookies.unsafeSet(self.cookies, name, "", {
        ...(options ?? {}),
        maxAge: 0
      }),
      self.body
    )
)

/** @internal */
export const setHeaders = dual<
  (input: Headers.Input) => (self: ServerResponse.HttpServerResponse) => ServerResponse.HttpServerResponse,
  (self: ServerResponse.HttpServerResponse, input: Headers.Input) => ServerResponse.HttpServerResponse
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
  (
    status: number,
    statusText?: string
  ) => (self: ServerResponse.HttpServerResponse) => ServerResponse.HttpServerResponse,
  (self: ServerResponse.HttpServerResponse, status: number, statusText?: string) => ServerResponse.HttpServerResponse
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
  (body: Body.HttpBody) => (self: ServerResponse.HttpServerResponse) => ServerResponse.HttpServerResponse,
  (self: ServerResponse.HttpServerResponse, body: Body.HttpBody) => ServerResponse.HttpServerResponse
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
export const toWeb = (response: ServerResponse.HttpServerResponse, options?: {
  readonly withoutBody?: boolean | undefined
  readonly runtime?: Runtime.Runtime<never> | undefined
}): Response => {
  const headers = new globalThis.Headers(response.headers)
  if (!Cookies.isEmpty(response.cookies)) {
    const toAdd = Cookies.toSetCookieHeaders(response.cookies)
    for (const header of toAdd) {
      headers.append("set-cookie", header)
    }
  }
  if (options?.withoutBody) {
    return new Response(undefined, {
      status: response.status,
      statusText: response.statusText as string,
      headers
    })
  }
  const body = response.body
  switch (body._tag) {
    case "Empty": {
      return new Response(undefined, {
        status: response.status,
        statusText: response.statusText as string,
        headers
      })
    }
    case "Uint8Array":
    case "Raw": {
      if (body.body instanceof Response) {
        for (const [key, value] of headers as any) {
          body.body.headers.set(key, value)
        }
        return body.body
      }
      return new Response(body.body as any, {
        status: response.status,
        statusText: response.statusText,
        headers
      })
    }
    case "FormData": {
      return new Response(body.formData as any, {
        status: response.status,
        statusText: response.statusText,
        headers
      })
    }
    case "Stream": {
      return new Response(Stream.toReadableStreamRuntime(body.stream, options?.runtime ?? Runtime.defaultRuntime), {
        status: response.status,
        statusText: response.statusText,
        headers
      })
    }
  }
}
