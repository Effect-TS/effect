import * as Effect from "effect/Effect"
import * as Cookies from "effect/http/Cookies"
import * as Redacted from "effect/Redacted"
import * as Schema from "effect/Schema"

import type { CredentialSlot } from "../operations/credentials.ts"
import { SessionCacheGeneration } from "../sessions/cookieCache.ts"
import { origin } from "../shared/origin.ts"
import { OperationHttpError } from "./errors.ts"
import { credentialSlots } from "./models.ts"
import { OperationHttpServerConfig } from "./operationHttpServerConfig.ts"
import { generationCookieConfiguration, optionalCookie } from "./sessionCacheCookie.ts"

/**
 * Browser mutation admission is independent of body encoding.
 *
 * @internal
 */
export const mutationSecurity = Effect.fnUntraced(function*(request: Request) {
  const config = yield* OperationHttpServerConfig
  const requestOrigin = request.headers.get("origin")

  if (
    ["GET", "HEAD", "OPTIONS"].includes(request.method) ||
    requestOrigin === null ||
    !config.trustedOrigins.includes(requestOrigin)
  ) {
    return yield* OperationHttpError.make({ reason: "origin" })
  }
  if (request.headers.get(config.csrfHeader) !== config.csrfValue) {
    return yield* OperationHttpError.make({ reason: "csrf" })
  }
})

/** @internal */
export const requestSecurity = Effect.fnUntraced(function*(
  request: Request,
  kind: "operation" | "callback" | "read" | "request"
) {
  const config = yield* OperationHttpServerConfig

  const publicOrigin = typeof config.publicOrigin === "string"
    ? config.publicOrigin
    : yield* config.publicOrigin(request)

  if (!Schema.is(origin)(publicOrigin)) return yield* OperationHttpError.make({ reason: "origin" })
  const requestOrigin = request.headers.get("origin")

  const native = config.native !== undefined && request.headers.get(config.native.modeHeader) === "native"

  if (native) {
    if (
      kind === "callback" ||
      requestOrigin !== null ||
      request.headers.has("sec-fetch-mode") ||
      request.headers.has("cookie")
    ) {
      return yield* OperationHttpError.make({ reason: "origin" })
    }
    yield* config.native!.authorize(request)
  } else if (kind === "operation") {
    yield* mutationSecurity(request)
    if (
      request.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase() !==
        "application/json"
    ) {
      return yield* OperationHttpError.make({ reason: "csrf" })
    }
  }
  if (kind === "read" && requestOrigin !== null && !config.trustedOrigins.includes(requestOrigin)) {
    return yield* OperationHttpError.make({ reason: "origin" })
  }
  const rawCookie = request.headers.get("cookie") ?? ""

  if (rawCookie.length > 65536) return yield* OperationHttpError.make({ reason: "too-large" })
  const parts = rawCookie.split(";")
  const cacheName = config.cookies["session-cache"].name
  const generationName = generationCookieConfiguration(config.cookies["session-cache"]).name

  const cookieParts = new Map<string, string | undefined>()
  const authoritativeParts: Array<string> = []

  for (const part of parts) {
    const name = part.trim().split("=", 1)[0]

    // Undefined records ambiguity without retaining duplicate credential values.
    cookieParts.set(name, cookieParts.has(name) ? undefined : part)
    if (name !== cacheName && name !== generationName) authoritativeParts.push(part)
  }

  const parsed = Cookies.parseHeader(authoritativeParts.join(";"))
  const credentials: Partial<Record<CredentialSlot, Redacted.Redacted<string>>> = {}

  for (const slot of credentialSlots) {
    const configured = config.cookies[slot]

    if (slot === "session-cache") {
      const value = native ? undefined : optionalCookie(cookieParts.get(cacheName), cacheName)

      if (value !== undefined) credentials[slot] = Redacted.make(value)
      continue
    }
    if (cookieParts.has(configured.name) && cookieParts.get(configured.name) === undefined) {
      return yield* OperationHttpError.make({ reason: "credentials" })
    }

    const header = config.native === undefined ? null : request.headers.get(config.native.requestHeaders[slot])

    if (!native && header !== null) {
      return yield* OperationHttpError.make({ reason: "credentials" })
    }
    const value = native ? header : parsed[configured.name]

    if (value !== null && value !== undefined) {
      if (value.length === 0 || value.length > 16384 || /[\r\n]/.test(value)) {
        return yield* OperationHttpError.make({ reason: "credentials" })
      }
      credentials[slot] = Redacted.make(value)
    }
  }

  const generation = native
    ? undefined
    : optionalCookie(cookieParts.get(generationName), generationName)

  return {
    native,
    credentials: Object.freeze(credentials),
    publicOrigin,
    requestOrigin,
    ...(Schema.is(SessionCacheGeneration)(generation)
      ? { sessionCacheGeneration: Redacted.make(generation) }
      : {})
  }
})
