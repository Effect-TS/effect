/**
 * @since 1.0.0
 */
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Inspectable from "effect/Inspectable"
import { type Pipeable, pipeArguments } from "effect/Pipeable"
import * as ReadonlyArray from "effect/ReadonlyArray"
import { TypeIdError } from "../Error.js"

/**
 * @since 1.0.0
 * @category type ids
 */
export const TypeId = Symbol.for("@effect/platform/Http/Cookies")

/**
 * @since 1.0.0
 * @category type ids
 */
export type TypeId = typeof TypeId

/**
 * @since 1.0.0
 * @category models
 */
export interface Cookies extends Pipeable, Inspectable.Inspectable {
  readonly [TypeId]: TypeId
  readonly cookies: ReadonlyArray<Cookie>
}

/**
 * @since 1.0.0
 * @category type ids
 */
export const CookieTypeId = Symbol.for("@effect/platform/Http/Cookies/Cookie")

/**
 * @since 1.0.0
 * @category type ids
 */
export type CookieTypeId = typeof CookieTypeId

/**
 * @since 1.0.0
 * @category cookie
 */
export interface Cookie extends Inspectable.Inspectable {
  readonly [CookieTypeId]: CookieTypeId
  readonly name: string
  readonly value: string
  readonly valueEncoded: string
  readonly options?: {
    readonly domain?: string | undefined
    readonly expires?: Date | undefined
    readonly maxAge?: Duration.DurationInput | undefined
    readonly path?: string | undefined
    readonly priority?: "low" | "medium" | "high" | undefined
    readonly httpOnly?: boolean | undefined
    readonly secure?: boolean | undefined
    readonly partitioned?: boolean | undefined
    readonly sameSite?: "lax" | "strict" | "none" | undefined
  } | undefined
}

/**
 * @since 1.0.0
 * @category type ids
 */
export const ErrorTypeId = Symbol.for("@effect/platform/Http/Cookies/CookieError")

/**
 * @since 1.0.0
 * @category type ids
 */
export type ErrorTypeId = typeof ErrorTypeId

/**
 * @since 1.0.0
 * @category errors
 */
export class CookiesError extends TypeIdError(ErrorTypeId, "CookieError")<{
  readonly reason: "InvalidName" | "InvalidValue" | "InvalidDomain" | "InvalidPath" | "InfinityMaxAge"
}> {
  get message() {
    return this.reason
  }
}

const Proto: Omit<Cookies, "cookies"> = {
  [TypeId]: TypeId,
  ...Inspectable.BaseProto,
  toJSON(this: Cookies) {
    return {
      _id: "@effect/platform/Http/Cookies",
      cookies: this.cookies.map((cookie) => cookie.toJSON())
    }
  },
  pipe() {
    return pipeArguments(this, arguments)
  }
}

/**
 * Create a Cookies object from an Iterable
 *
 * @since 1.0.0
 * @category constructors
 */
export const fromIterable = (cookies: Iterable<Cookie>): Cookies => {
  const self = Object.create(Proto)
  self.cookies = ReadonlyArray.fromIterable(cookies)
  return self
}

// eslint-disable-next-line no-control-regex
const fieldContentRegExp = /^[\u0009\u0020-\u007e\u0080-\u00ff]+$/

const CookieProto = {
  [CookieTypeId]: CookieTypeId,
  ...Inspectable.BaseProto,
  toJSON(this: Cookie) {
    return {
      _id: "@effect/platform/Http/Cookies/Cookie",
      name: this.name,
      value: this.value,
      options: this.options
    }
  }
}

/**
 * Create a new cookie
 *
 * @since 1.0.0
 * @category constructors
 */
export function makeCookie(
  name: string,
  value: string,
  options?: Cookie["options"]
): Effect.Effect<Cookie, CookiesError> {
  if (!fieldContentRegExp.test(self.name)) {
    return Effect.fail(new CookiesError({ reason: "InvalidName" }))
  }
  const encodedValue = encodeURIComponent(value)
  if (encodedValue && !fieldContentRegExp.test(encodedValue)) {
    return Effect.fail(new CookiesError({ reason: "InvalidValue" }))
  }

  if (options !== undefined) {
    if (options.domain !== undefined && !fieldContentRegExp.test(options.domain)) {
      return Effect.fail(new CookiesError({ reason: "InvalidDomain" }))
    }

    if (options.path !== undefined && !fieldContentRegExp.test(options.path)) {
      return Effect.fail(new CookiesError({ reason: "InvalidPath" }))
    }

    if (options.maxAge !== undefined && !Duration.isFinite(Duration.decode(options.maxAge))) {
      return Effect.fail(new CookiesError({ reason: "InfinityMaxAge" }))
    }
  }

  return Effect.succeed(Object.assign(Object.create(CookieProto), {
    name,
    value,
    valueEncoded: encodedValue,
    options
  }))
}

/**
 * Serialize a cookie into a string
 *
 * Adapted from https://github.com/fastify/fastify-cookie under MIT License
 *
 * @since 1.0.0
 * @category encoding
 */
export function serializeCookie(self: Cookie): string {
  let str = self.name + "=" + self.valueEncoded

  if (self.options === undefined) {
    return str
  }
  const options = self.options

  if (options.maxAge !== undefined) {
    const maxAge = Duration.toSeconds(options.maxAge)
    str += "; Max-Age=" + Math.trunc(maxAge)
  }

  if (options.domain !== undefined) {
    str += "; Domain=" + options.domain
  }

  if (options.path !== undefined) {
    str += "; Path=" + options.path
  }

  if (options.priority !== undefined) {
    switch (options.priority) {
      case "low":
        str += "; Priority=Low"
        break
      case "medium":
        str += "; Priority=Medium"
        break
      case "high":
        str += "; Priority=High"
        break
    }
  }

  if (options.expires !== undefined) {
    str += "; Expires=" + options.expires.toUTCString()
  }

  if (options.httpOnly) {
    str += "; HttpOnly"
  }

  if (options.secure) {
    str += "; Secure"
  }

  // Draft implementation to support Chrome from 2024-Q1 forward.
  // See https://datatracker.ietf.org/doc/html/draft-cutler-httpbis-partitioned-cookies#section-2.1
  if (options.partitioned) {
    str += "; Partitioned"
  }

  if (options.sameSite !== undefined) {
    switch (options.sameSite) {
      case "lax":
        str += "; SameSite=Lax"
        break
      case "strict":
        str += "; SameSite=Strict"
        break
      case "none":
        str += "; SameSite=None"
        break
    }
  }

  return str
}

/**
 * Serialize a Cookies object into Headers object containing one or more Set-Cookie headers
 *
 * @since 1.0.0
 * @category encoding
 */
export const toSetCookieHeader = (self: Cookies): string =>
  self.cookies.map((cookie) => `${cookie.name}=${cookie.valueEncoded}`).join("; ")

/**
 * Serialize a Cookies object into a Cookie header
 *
 * @since 1.0.0
 * @category encoding
 */
export const toCookieHeader = (self: Cookies): string =>
  self.cookies.map((cookie) => `${cookie.name}=${cookie.valueEncoded}`).join("; ")

/**
 * Parse a cookie header into a record of key-value pairs
 *
 * Adapted from https://github.com/fastify/fastify-cookie under MIT License
 *
 * @since 1.0.0
 * @category decoding
 */
export function parseHeader(header: string): Record<string, string> {
  const result: Record<string, string> = {}

  const strLen = header.length
  let pos = 0
  let terminatorPos = 0
  // eslint-disable-next-line no-constant-condition
  while (true) {
    if (terminatorPos === strLen) break
    terminatorPos = header.indexOf(";", pos)
    if (terminatorPos === -1) terminatorPos = strLen // This is the last pair

    let eqIdx = header.indexOf("=", pos)
    if (eqIdx === -1) break // No key-value pairs left
    if (eqIdx > terminatorPos) {
      // Malformed key-value pair
      pos = terminatorPos + 1
      continue
    }

    const key = header.substring(pos, eqIdx++).trim()
    if (result[key] === undefined) {
      const val = header.charCodeAt(eqIdx) === 0x22
        ? header.substring(eqIdx + 1, terminatorPos - 1).trim()
        : header.substring(eqIdx, terminatorPos).trim()

      result[key] = !(val.indexOf("%") === -1)
        ? tryDecodeURIComponent(val)
        : val
    }

    pos = terminatorPos + 1
  }

  return result
}

const tryDecodeURIComponent = (str: string): string => {
  try {
    return decodeURIComponent(str)
  } catch (_) {
    return str
  }
}
