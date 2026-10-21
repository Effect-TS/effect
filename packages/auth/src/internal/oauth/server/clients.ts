import * as Cause from "effect/Cause"
import * as Clock from "effect/Clock"
import * as Digest from "effect/crypto/Digest"
import * as Mac from "effect/crypto/Mac"
import * as SecureRandom from "effect/crypto/SecureRandom"
import * as Signature from "effect/crypto/Signature"
import * as Effect from "effect/Effect"
import * as Base64 from "effect/encoding/Base64"
import * as Base64Url from "effect/encoding/Base64Url"
import * as FetchHttpClient from "effect/http/FetchHttpClient"
import * as HttpClient from "effect/http/HttpClient"
import * as Option from "effect/Option"
import * as Redacted from "effect/Redacted"
import * as Schema from "effect/Schema"
import * as Semaphore from "effect/Semaphore"
import * as Stream from "effect/Stream"
import * as Jwk from "../../../jose/Jwk.ts"
import * as Jwks from "../../../jose/Jwks.ts"
import * as Jwt from "../../../jose/Jwt.ts"

import { timeoutOrElseWithCause } from "../../shared/timeout.ts"
import {
  AssertionAlgorithms,
  Client,
  ClientAssertion,
  ConfigurationError,
  maximumClientAssertionLength,
  Persistence,
  RedirectUri,
  reject,
  Text,
  Unavailable,
  Url
} from "./models.ts"

/** Explicit trust policy. The supplied HttpClient must enforce network egress
 * restrictions (including DNS rebinding protection) and must not follow redirects.
 * No ambient browser credentials or request credentials may be added to it.
 */
export interface MetadataOptions {
  readonly allowedOrigins: ReadonlyArray<string>
}

// Require a non-root path and reject dot segments before URL normalizes them.
const MetadataUrl = Text.check(
  Schema.makeFilter((text) => {
    try {
      const url = new URL(text)
      const path = text.replace(/^https:\/\/[^/]+/i, "").split(/[?#]/, 1)[0]

      return (
        /^https:\/\/[^/?#]+\/[^?#]/i.test(text) &&
        url.protocol === "https:" &&
        url.username === "" &&
        url.password === "" &&
        !text.includes("#") &&
        !/[\s\\]/.test(text) &&
        url.pathname !== "/" &&
        !path.split("/").some((part) => /^(?:\.|%2e){1,2}$/i.test(part))
      )
    } catch {
      return false
    }
  })
)

const TrustedOrigin = Text.check(
  Schema.makeFilter((text) => {
    try {
      const url = new URL(text)

      // DNS names only. Address literals and local names must never be fetch targets.
      return (
        url.origin === text &&
        url.protocol === "https:" &&
        url.hostname.includes(".") &&
        !/^[\d.]+$/.test(url.hostname) &&
        !url.hostname.includes(":") &&
        !/(?:^|\.)(?:localhost|local|internal)$/.test(url.hostname) &&
        !url.hostname.endsWith(".")
      )
    } catch {
      return false
    }
  })
)

/** @internal */
export const MetadataConfiguration = Schema.Struct({
  allowedOrigins: Schema.NonEmptyArray(TrustedOrigin).check(Schema.isMaxLength(128))
})

const KeyUrl = Url.check(
  Schema.makeFilter(
    (text) => /^https:\/\//i.test(text) && Schema.is(TrustedOrigin)(new URL(text).origin)
  )
)

const AssertionClaims = Schema.Struct({
  iss: Text,
  sub: Text,
  aud: Schema.Union([Text, Schema.NonEmptyArray(Text)]),
  exp: Schema.Finite,
  jti: Text,
  iat: Schema.optionalKey(Schema.Finite)
})

const Document = Schema.Struct({
  client_id: MetadataUrl,
  client_name: Text,
  redirect_uris: Schema.NonEmptyArray(RedirectUri).check(Schema.isMaxLength(16)),
  application_type: Schema.optionalKey(Schema.Literals(["web", "native"])),
  token_endpoint_auth_method: Schema.optionalKey(Schema.Literals(["none", "private_key_jwt"])),
  token_endpoint_auth_signing_alg: Schema.optionalKey(Jwk.AsymmetricAlgorithm),
  jwks: Schema.optionalKey(Jwks.KeySet),
  jwks_uri: Schema.optionalKey(KeyUrl),
  client_secret: Schema.optionalKey(Schema.Never),
  client_secret_expires_at: Schema.optionalKey(Schema.Never),
  grant_types: Schema.optionalKey(
    Schema.NonEmptyArray(Schema.Literals(["authorization_code", "refresh_token"]))
  ),
  response_types: Schema.optionalKey(Schema.NonEmptyArray(Schema.Literal("code")))
})

/**
 * Match exactly except for a native client's HTTP loopback port (RFC 8252).
 *
 * @internal
 */
export const matchesRedirect = (client: Client, requested: string) =>
  client.redirectUris.some((registered) => {
    if (registered === requested) return true
    if (client.applicationType !== "native") return false
    const a = new URL(registered)
    const b = new URL(requested)

    if (
      a.protocol !== "http:" ||
      b.protocol !== "http:" ||
      !["localhost", "127.0.0.1", "[::1]"].includes(a.hostname)
    ) {
      return false
    }

    // Removing only the literal authority port preserves exact path/query spelling.
    return (
      registered.replace(
        /^(http:\/\/(?:localhost|127\.0\.0\.1|\[::1\]))(?::\d+)?(?=[/?]|$)/,
        "$1"
      ) ===
        requested.replace(/^(http:\/\/(?:localhost|127\.0\.0\.1|\[::1\]))(?::\d+)?(?=[/?]|$)/, "$1")
    )
  })

const cacheLifetime = (headers: Readonly<Record<string, string>>, now: number) => {
  const control = headers["cache-control"] ?? ""

  if (
    /(?:^|,)\s*(?:no-store|no-cache|private)\b/i.test(control) ||
    headers.vary?.split(",").some((value) => value.trim() === "*")
  ) {
    return 0
  }
  const maxAges = [...control.matchAll(/(?:^|,)\s*(s-maxage|max-age)\s*=\s*([^,]*)/gi)]

  if (
    ["max-age", "s-maxage"].some(
      (name) => maxAges.filter((match) => match[1].toLowerCase() === name).length > 1
    )
  ) {
    return 0
  }

  const maxAge = (maxAges.find((match) => match[1].toLowerCase() === "s-maxage") ??
    maxAges[0])?.[2].trim()

  if (maxAge !== undefined && !/^(?:\d+|"\d+")$/.test(maxAge)) return 0
  const age = Number(headers.age ?? 0)
  const date = Date.parse(headers.date ?? "")
  const elapsed = Math.max(Number.isFinite(date) ? (now - date) / 1000 : 0, age)

  const freshness = maxAge === undefined
    ? (Date.parse(headers.expires ?? "") - (Number.isFinite(date) ? date : now)) / 1000
    : Number(maxAge.replaceAll("\"", ""))

  return Number.isFinite(freshness) && Number.isFinite(elapsed)
    ? Math.max(0, Math.min(300, freshness - elapsed)) * 1000
    : 0
}

interface Cached<A> {
  readonly value: A
  readonly expires: number
}

const remember = <A>(cache: Map<string, Cached<A>>, id: string, entry: Cached<A>) => {
  if (cache.size >= 256) {
    const oldest = cache.keys().next().value

    if (oldest !== undefined) cache.delete(oldest)
  }
  cache.set(id, entry)
}

/** @internal */
export const makeClients = Effect.fnUntraced(function*(
  clients: ReadonlyArray<Client>,
  metadata: MetadataOptions | undefined,
  issuer: string,
  tokenEndpoint: string
) {
  // The network dependency is explicit in the server Layer, including when disabled.
  const http = HttpClient.withScope(yield* HttpClient.HttpClient)
  const mac = yield* Mac.Mac
  const signatures = yield* Signature.Signature
  const store = yield* Persistence
  const permits = yield* Semaphore.make(8)
  const cache = new Map<string, Cached<Client>>()
  const keyCache = new Map<string, Cached<Jwks.Jwks["Service"]>>()
  const localResolvers = new WeakMap<Jwks.KeySet, Jwks.Jwks["Service"]>()
  const random = yield* SecureRandom.SecureRandom
  const digest = yield* Digest.Digest

  const key = yield* random.randomBytes(32).pipe(
    Effect.flatMap((bytes) =>
      Mac.key(Mac.hmacSha256, bytes).pipe(
        Effect.ensuring(Effect.sync(() => bytes.fill(0)))
      )
    ),
    Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, () => ConfigurationError.make({}))))
  )

  const secrets = new Map<string, Uint8Array>()

  for (const client of clients) {
    if (client.clientAssertion?.jwksUri !== undefined) {
      yield* Schema.decodeEffect(KeyUrl)(client.clientAssertion.jwksUri).pipe(
        Effect.mapError(() => ConfigurationError.make({}))
      )
    }
    if (client.clientSecret === undefined) continue

    const tag = yield* mac
      .sign(key, new TextEncoder().encode(Redacted.value(client.clientSecret)))
      .pipe(
        Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, () => ConfigurationError.make({}))))
      )

    secrets.set(client.clientId, tag)
  }

  // CIMD and its JWKS share admission, egress and HTTP freshness policy. JOSE
  // owns key selection and cryptography after this untrusted discovery boundary.
  const fetchJson = Effect.fnUntraced(
    function*(url: string, maximum: number) {
      const response = yield* http.get(url, { headers: { accept: "application/json" } })

      if (response.status !== 200 || (response.url !== "" && response.url !== new URL(url).href)) {
        return yield* reject("invalid_client")
      }
      if (
        !/^application\/(?:json|[\w.-]+\+json)(?:\s*;|$)/i.test(
          response.headers["content-type"] ?? ""
        )
      ) {
        return yield* reject("invalid_client")
      }
      const buffer = new Uint8Array(maximum)

      const length = yield* Stream.runFoldEffect(
        response.stream,
        () => 0,
        (length, chunk) => {
          if (chunk.length > buffer.length - length) return Effect.fail(reject("invalid_client"))
          buffer.set(chunk, length)

          return Effect.succeed(length + chunk.length)
        }
      )

      const time = yield* Clock.currentTimeMillis

      return {
        text: new TextDecoder().decode(buffer.subarray(0, length)),
        expires: time + cacheLifetime(response.headers, time)
      }
    },
    Effect.scoped,
    // Workerd supports manual redirects; the status check above rejects them.
    Effect.provideService(FetchHttpClient.RequestInit, { redirect: "manual", credentials: "omit" }),
    Effect.catchCause((cause) =>
      Effect.failCause(
        Cause.map(cause, (error) => error._tag === "HttpClientError" ? Unavailable.make({}) : error)
      )
    ),
    timeoutOrElseWithCause({ duration: "5 seconds", orElse: () => Unavailable.make({}) }),
    permits.withPermitsIfAvailable(1),
    Effect.flatMap(Option.match({ onNone: () => Unavailable.make({}), onSome: Effect.succeed }))
  )

  const fetch = Effect.fnUntraced(function*(id: string) {
    const url = yield* Schema.decodeEffect(MetadataUrl)(id).pipe(
      Effect.mapError(() => reject("invalid_client"))
    )

    if (metadata === undefined || !metadata.allowedOrigins.includes(new URL(url).origin)) {
      return yield* reject("invalid_client")
    }
    const response = yield* fetchJson(url, 5120)

    const document = yield* Schema.decodeEffect(Schema.fromJsonString(Document))(
      response.text
    ).pipe(Effect.mapError(() => reject("invalid_client")))

    if (
      document.client_id !== id ||
      (document.grant_types !== undefined && !document.grant_types.includes("authorization_code"))
    ) {
      return yield* reject("invalid_client")
    }

    const clientAssertion = document.token_endpoint_auth_method === "private_key_jwt"
      ? yield* Schema.decodeEffect(ClientAssertion)({
        ...(document.jwks === undefined ? {} : { jwks: document.jwks }),
        ...(document.jwks_uri === undefined ? {} : { jwksUri: document.jwks_uri }),
        ...(document.token_endpoint_auth_signing_alg === undefined
          ? {}
          : { algorithm: document.token_endpoint_auth_signing_alg })
      }).pipe(Effect.mapError(() => reject("invalid_client")))
      : undefined

    if (
      clientAssertion?.jwksUri !== undefined &&
      !metadata.allowedOrigins.includes(new URL(clientAssertion.jwksUri).origin)
    ) {
      return yield* reject("invalid_client")
    }

    const client = Client.make({
      clientId: id,
      name: document.client_name,
      redirectUris: document.redirect_uris,
      ...(document.application_type === undefined
        ? {}
        : { applicationType: document.application_type }),
      grantTypes: document.grant_types ?? ["authorization_code"],
      ...(clientAssertion === undefined ? {} : { clientAssertion })
    })

    if (response.expires > (yield* Clock.currentTimeMillis)) {
      remember(cache, id, { value: client, expires: response.expires })
    }

    return client
  })

  const resolve = Effect.fnUntraced(function*(id: string) {
    const registered = clients.find((client) => client.clientId === id)

    if (registered !== undefined) return registered
    const cached = cache.get(id)

    if (cached !== undefined && cached.expires > (yield* Clock.currentTimeMillis)) {
      return cached.value
    }
    cache.delete(id)

    return yield* fetch(id)
  })

  const assertionKeys = Effect.fnUntraced(function*(settings: typeof ClientAssertion.Type) {
    if (settings.jwks !== undefined) {
      const cached = localResolvers.get(settings.jwks)

      if (cached !== undefined) return cached

      const resolver = yield* Jwks.makeLocal(settings.jwks).pipe(
        Effect.mapError(() => reject("invalid_client"))
      )

      localResolvers.set(settings.jwks, resolver)

      return resolver
    }
    if (settings.jwksUri === undefined) return yield* reject("invalid_client")
    const cached = keyCache.get(settings.jwksUri)

    if (cached !== undefined && cached.expires > (yield* Clock.currentTimeMillis)) {
      return cached.value
    }
    keyCache.delete(settings.jwksUri)
    const response = yield* fetchJson(settings.jwksUri, 131072)

    const keys = yield* Schema.decodeEffect(Schema.fromJsonString(Jwks.KeySet))(response.text).pipe(
      Effect.mapError(() => reject("invalid_client"))
    )

    const resolver = yield* Jwks.makeLocal(keys).pipe(
      Effect.mapError(() => reject("invalid_client"))
    )

    if (response.expires > (yield* Clock.currentTimeMillis)) {
      remember(keyCache, settings.jwksUri, { value: resolver, expires: response.expires })
    }

    return resolver
  })

  const verifyAssertion = Effect.fnUntraced(function*(
    client: Client,
    assertion: string,
    endpoint: string
  ) {
    if (client.clientAssertion === undefined) return yield* reject("invalid_client")
    const settings = client.clientAssertion
    const resolver = yield* assertionKeys(settings)

    const { claims } = yield* Jwt.verifyWithKeySet(AssertionClaims, Redacted.make(assertion), {
      algorithms: settings.algorithm === undefined ? AssertionAlgorithms : [settings.algorithm],
      issuer: client.clientId,
      subject: client.clientId,
      audience: [issuer, tokenEndpoint, endpoint],
      requiredClaims: ["iss", "sub", "aud", "exp", "jti"]
    }).pipe(
      Effect.provideService(Jwks.Jwks, resolver),
      Effect.provideService(Signature.Signature, signatures),
      Effect.provideService(Mac.Mac, mac),
      Effect.catchCause((cause) =>
        Effect.failCause(
          Cause.map(cause, (error) =>
            error._tag === "JoseCryptoUnavailable" ||
              error._tag === "JoseUnsupportedAlgorithm" ||
              error._tag === "JoseJwksUnavailable"
              ? Unavailable.make({})
              : reject("invalid_client"))
        )
      )
    )

    const now = (yield* Clock.currentTimeMillis) / 1000

    if (
      claims.exp <= now ||
      claims.exp > now + 300 ||
      (claims.iat !== undefined && (claims.iat > now || claims.exp <= claims.iat))
    ) {
      return yield* reject("invalid_client")
    }

    const receiptId = yield* digest
      .digest(Digest.sha256, new TextEncoder().encode(JSON.stringify([client.clientId, claims.jti])))
      .pipe(
        Effect.map(Base64Url.encode),
        Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, () => Unavailable.make({}))))
      )

    if (
      !(yield* store.consumeAssertion(issuer, {
        id: receiptId,
        expiresAtMillis: Math.ceil(claims.exp * 1000)
      }))
    ) {
      return yield* reject("invalid_client")
    }
  })

  const authenticate = Effect.fnUntraced(function*(
    body: Readonly<Record<string, string>>,
    header: string | null,
    endpoint: string
  ) {
    let id = body.client_id
    let secret = body.client_secret

    const assertion = body.client_assertion

    if (assertion !== undefined || body.client_assertion_type !== undefined) {
      if (secret !== undefined || header !== null) return yield* reject()
      if (
        assertion === undefined ||
        assertion.length > maximumClientAssertionLength ||
        body.client_assertion_type !== "urn:ietf:params:oauth:client-assertion-type:jwt-bearer"
      ) {
        return yield* reject("invalid_client")
      }
      // An unverified subject is only a discovery hint; verification below binds
      // issuer and subject to the resolved registration before consuming a receipt.
      if (id === undefined) {
        const unverified = yield* Jwt.decodeUnverified(Redacted.make(assertion)).pipe(
          Effect.mapError(() => reject("invalid_client"))
        )

        id = (yield* Schema.decodeUnknownEffect(Schema.Struct({ sub: Text }))(
          Redacted.value(unverified.claims)
        ).pipe(Effect.mapError(() => reject("invalid_client")))).sub
      }
      const client = yield* resolve(id)

      yield* verifyAssertion(client, assertion, endpoint)

      return client
    }
    if (header !== null) {
      if (secret !== undefined) return yield* reject()
      const basic = /^Basic ([A-Za-z0-9+/]+=*)$/i.exec(header)?.[1]

      if (basic === undefined) return yield* reject("invalid_client")

      const decoded = yield* Effect.fromResult(Base64.decodeString(basic)).pipe(
        Effect.mapError(() => reject("invalid_client"))
      )

      const separator = decoded.indexOf(":")

      if (separator < 0) return yield* reject("invalid_client")

      const credentials = yield* Effect.try({
        try: () => [
          decodeURIComponent(decoded.slice(0, separator).replaceAll("+", " ")),
          decodeURIComponent(decoded.slice(separator + 1).replaceAll("+", " "))
        ],
        catch: () => reject("invalid_client")
      })

      if (id !== undefined && id !== credentials[0]) return yield* reject("invalid_client")
      ;[id, secret] = credentials
    }
    if (id === undefined) return yield* reject("invalid_client")
    const client = yield* resolve(id)

    if (client.clientAssertion !== undefined) return yield* reject("invalid_client")

    if (client.clientSecret === undefined) {
      if (secret !== undefined || header !== null) return yield* reject("invalid_client")
    } else {
      if (secret === undefined) return yield* reject("invalid_client")
      // Backend verification avoids comparing confidential credentials as strings.
      const expected = secrets.get(id)

      if (
        expected === undefined ||
        !(yield* mac
          .verify(key, expected, new TextEncoder().encode(secret))
          .pipe(
            Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, () => Unavailable.make({}))))
          ))
      ) {
        return yield* reject("invalid_client")
      }
    }

    return client
  })

  return { resolve, authenticate }
})
