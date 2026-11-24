/**
 * Webhook delivery for the Events extension (SEP-3415): `events/subscribe`
 * validation, subscription identity, Standard Webhooks signing, the endpoint
 * verification handshake and the delivery loop.
 *
 * Subscriptions live in memory. Every grant is finite, so a subscription lost
 * in a restart comes back on the client's next refresh, from its cursor.
 */
import * as Bytes from "../../Bytes.ts"
import * as Cause from "../../Cause.ts"
import * as Clock from "../../Clock.ts"
import * as Digest from "../../crypto/Digest.ts"
import * as Mac from "../../crypto/Mac.ts"
import * as SecureRandom from "../../crypto/SecureRandom.ts"
import * as Deferred from "../../Deferred.ts"
import * as Duration from "../../Duration.ts"
import * as Effect from "../../Effect.ts"
import * as Base64 from "../../encoding/Base64.ts"
import * as Base64Url from "../../encoding/Base64Url.ts"
import * as Exit from "../../Exit.ts"
import * as Fiber from "../../Fiber.ts"
import * as FetchHttpClient from "../../http/FetchHttpClient.ts"
import * as HttpClient from "../../http/HttpClient.ts"
import * as HttpClientRequest from "../../http/HttpClientRequest.ts"
import type * as HttpClientResponse from "../../http/HttpClientResponse.ts"
import * as Url from "../../http/Url.ts"
import * as Option from "../../Option.ts"
import * as Result from "../../Result.ts"
import * as Stream from "../../Stream.ts"
import * as PublicMcpSchema from "../McpSchema.ts"
import type * as McpCore from "./mcpCore.ts"
import { wireError } from "./mcpEvents.ts"

const MINUTE_MS = 60_000
const MIN_TTL_MS = MINUTE_MS
// Short grants because subscriptions live in memory: a restart loses them until the next refresh.
const MAX_TTL_MS = 60 * MINUTE_MS
const DEFAULT_TTL_MS = 15 * MINUTE_MS
const MAX_ATTEMPTS = 5
// Retries wait 30 s, 1, 2 and 4 minutes: about 7.5 minutes in all.
const FIRST_RETRY_MS = 30_000
const REQUEST_TIMEOUT_MS = 10_000
// Deliveries signed with the old secret before a rotation still verify for this long.
const ROTATION_GRACE_MS = 5 * MINUTE_MS
const VERIFIED_FOR_MS = MAX_TTL_MS
// A failed challenge is answered from here, so repeated subscribes cannot flood the endpoint.
const FAILED_FOR_MS = 5 * MINUTE_MS
// Verification POSTs one destination host receives per minute, across all principals.
const VERIFICATIONS_PER_HOST_PER_MINUTE = 10
const MAX_SUBSCRIPTIONS_PER_PRINCIPAL = 100
// A verification reads this many bytes of the response at most; a delivery reads none.
const MAX_CHALLENGE_RESPONSE_BYTES = 8_192
const SECRET_PREFIX = "whsec_"

/**
 * The fixed categories `deliveryStatus.lastError` and `CallbackEndpointError`
 * report; never the endpoint's own response.
 *
 * @internal
 */
export type FailureCategory =
  | "connection_refused"
  | "timeout"
  | "tls_error"
  | "http_4xx"
  | "http_5xx"
  | "challenge_failed"

/**
 * @internal
 */
export interface Guard {
  readonly check: (url: URL) => Effect.Effect<void, { readonly message: string }>
  readonly allowsPlaintext?: ((url: URL) => boolean) | undefined
}

/**
 * @internal
 */
export interface Options {
  readonly guard: Guard
  readonly client: HttpClient.HttpClient
}

/**
 * @internal
 */
export interface SubscribeRequest {
  // The authenticated subject, part of the subscription's identity.
  readonly principal: string
  readonly name: string
  readonly arguments: Readonly<Record<string, unknown>>
  readonly delivery: Readonly<Record<string, unknown>>
  readonly cursor: string | null
  readonly ttlMs?: number | null | undefined
  // The event's argument decoder, run before the endpoint is contacted.
  readonly decode: Effect.Effect<unknown, McpCore.EventFailure>
  // Runs the event's stream for the subscription's lifetime, as push delivery does.
  readonly open: (
    decoded: unknown,
    deliver: (subscription: McpCore.EventSubscription) => Effect.Effect<void>
  ) => Effect.Effect<void, McpCore.EventFailure | McpCore.RequestRejected>
}

/**
 * @internal
 */
export interface SubscribeResult {
  readonly id: string
  readonly refreshBefore: string
  readonly cursor: string | null
  readonly truncated: boolean
  readonly deliveryStatus?: {
    readonly active: boolean
    readonly lastDeliveryAt: string | null
    readonly lastError: FailureCategory | null
  } | undefined
}

/**
 * @internal
 */
export interface UnsubscribeRequest {
  readonly principal: string
  readonly name: string
  readonly arguments: Readonly<Record<string, unknown>>
  readonly delivery: Readonly<Record<string, unknown>>
}

/**
 * @internal
 */
export interface Webhooks {
  readonly subscribe: (
    request: SubscribeRequest
  ) => Effect.Effect<SubscribeResult, McpCore.EventFailure | McpCore.RequestRejected>
  readonly unsubscribe: (request: UnsubscribeRequest) => Effect.Effect<void, McpCore.EventFailure>
}

interface Secret {
  readonly text: string
  readonly key: Mac.Key
}

interface Subscription {
  readonly id: string
  readonly principal: string
  readonly url: URL
  secret: Secret
  previous: { readonly key: Mac.Key; readonly until: number } | undefined
  expiresAt: number
  // Everything at or before it was acknowledged or given up on.
  watermark: string | null
  lastDeliveryAt: number | undefined
  lastError: FailureCategory | undefined
  fiber: Fiber.Fiber<void> | undefined
  // Completed when a refresh moves the deadline, so the expiry recomputes it.
  deadlineMoved: Deferred.Deferred<void>
  // Where the event's stream started, or why it could not; a same-key refresh waits for it.
  readonly accepted: Deferred.Deferred<
    { readonly cursor: string | null; readonly truncated: boolean },
    McpCore.EventFailure | McpCore.RequestRejected
  >
  // A gap whose envelope the endpoint never took, reported by the next refresh instead. An event
  // delivered after it does not clear it: receiving that event says nothing about the gap.
  gapPending: boolean
}

type Outcome =
  // `body` is read only for a verification, and is undefined when it was too long.
  | { readonly _tag: "Delivered"; readonly body: string | undefined }
  | { readonly _tag: "Failed"; readonly category: FailureCategory; readonly retryable: boolean }

const invalid = (message: string) => new PublicMcpSchema.InvalidParams({ message })

const checkMode = (delivery: Readonly<Record<string, unknown>>) =>
  delivery.mode === undefined || delivery.mode === "webhook"
    ? Effect.void
    : Effect.fail(invalid("delivery.mode must be 'webhook'"))

// The TTL granted for a suggested one: the default when none is suggested, and
// never unbounded, since subscriptions are not kept across restarts.
const grantTtl = (suggested: number | null | undefined): number =>
  suggested === undefined
    ? DEFAULT_TTL_MS
    : suggested === null
    ? MAX_TTL_MS
    : Math.min(MAX_TTL_MS, Math.max(MIN_TTL_MS, suggested))

// JSON with object keys sorted, so equal arguments serialize equally.
const canonicalJson = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`
  if (typeof value === "object" && value !== null) {
    const entries = Object.entries(value).filter(([, entry]) => entry !== undefined)
    entries.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    return `{${entries.map(([key, entry]) => `${JSON.stringify(key)}:${canonicalJson(entry)}`).join(",")}}`
  }
  return JSON.stringify(value) ?? "null"
}

const encoder = new TextEncoder()
const decoder = new TextDecoder()

const parseUrl = (value: unknown, guard: Guard) => {
  if (typeof value !== "string") return Effect.fail(invalid("delivery.url is required"))
  const parsed = Url.fromString(value)
  if (Result.isFailure(parsed)) return Effect.fail(invalid("delivery.url is not a valid URL"))
  const url = parsed.success
  if (url.protocol !== "https:" && !(url.protocol === "http:" && guard.allowsPlaintext?.(url) === true)) {
    return Effect.fail(invalid("delivery.url must use https"))
  }
  if (url.username !== "" || url.password !== "") {
    return Effect.fail(invalid("delivery.url must not carry credentials"))
  }
  url.hash = ""
  return Effect.succeed(url)
}

const parseSecret = (value: unknown): Effect.Effect<Secret, PublicMcpSchema.InvalidParams> => {
  const fail = Effect.fail(invalid("delivery.secret must be whsec_ and the base64 of 24 to 64 random bytes"))
  if (typeof value !== "string" || !value.startsWith(SECRET_PREFIX)) return fail
  const bytes = Base64.decode(value.slice(SECRET_PREFIX.length))
  if (Result.isFailure(bytes) || bytes.success.length < 24 || bytes.success.length > 64) return fail
  return Mac.key(Mac.hmacSha256, bytes.success).pipe(Effect.orDie, Effect.map((key) => ({ text: value, key })))
}

const statusCategory = (status: number): FailureCategory => (status >= 500 ? "http_5xx" : "http_4xx")

// Only codes and names are read, never what the endpoint sent.
const transportCategory = (error: unknown): FailureCategory => {
  let current: unknown = error
  for (let depth = 0; depth < 8 && typeof current === "object" && current !== null; depth++) {
    const code = (current as { readonly code?: unknown }).code
    if (typeof code === "string" && /CERT|TLS|SSL/.test(code)) return "tls_error"
    current = (current as { readonly cause?: unknown }).cause ??
      (current as { readonly reason?: unknown }).reason
  }
  return "connection_refused"
}

// Stops pulling past the cap; closing the request's scope then aborts the rest.
const readCapped = (response: HttpClientResponse.HttpClientResponse) =>
  Effect.suspend(() => {
    const chunks: Array<Uint8Array> = []
    let total = 0
    let oversized = false
    return response.stream.pipe(
      Stream.takeWhile((chunk) => {
        if (total + chunk.length > MAX_CHALLENGE_RESPONSE_BYTES) {
          oversized = true
          return false
        }
        total += chunk.length
        chunks.push(chunk)
        return true
      }),
      Stream.runDrain,
      Effect.map(() => oversized ? undefined : decoder.decode(Bytes.concat(chunks)))
    )
  })

const echoedChallenge = (body: string): string | undefined => {
  try {
    const parsed: unknown = JSON.parse(body)
    const challenge = typeof parsed === "object" && parsed !== null
      ? (parsed as { readonly challenge?: unknown }).challenge
      : undefined
    return typeof challenge === "string" ? challenge : undefined
  } catch {
    return undefined
  }
}

const callbackError = (category: FailureCategory) =>
  new PublicMcpSchema.CallbackEndpointError({
    message: `The callback endpoint failed verification: ${category}`,
    data: { reason: category }
  })

const iso = (millis: number) => new Date(millis).toISOString()

/**
 * @internal
 */
export const make = Effect.fnUntraced(function*(options: Options) {
  const scope = yield* Effect.scope
  const mac = yield* Mac.Mac
  const digest = yield* Digest.Digest
  const random = yield* SecureRandom.SecureRandom
  const { guard } = options
  // Closing a request's scope aborts its body, so a delivery never downloads what the endpoint sends.
  const client = HttpClient.withScope(options.client)
  const subscriptions = new Map<string, Subscription>()
  // Subscribes past the principal check that have not created their subscription yet.
  const pending = new Map<string, number>()
  // A failed challenge is cached too, with the category it is answered with.
  const verifications = new Map<string, { readonly until: number; readonly failure?: FailureCategory }>()
  const verifying = new Map<string, Deferred.Deferred<void, PublicMcpSchema.CallbackEndpointError>>()
  const verificationsByHost = new Map<string, Array<number>>()

  const forget = (subscription: Subscription) => {
    if (subscriptions.get(subscription.id) === subscription) subscriptions.delete(subscription.id)
  }

  const subscriptionId = (principal: string, url: URL, name: string, args: unknown) =>
    digest.digestHex(Digest.sha256, encoder.encode(canonicalJson([principal, url.href, name, args]))).pipe(
      Effect.map((hex) => `sub_${hex.slice(0, 32)}`)
    )

  // High entropy and never derived from the eventId; a retry reuses it.
  const messageId = (prefix: string) =>
    Effect.map(random.randomBytes(18), (bytes) => `${prefix}_${Base64Url.encode(bytes)}`)

  const sign = (keys: ReadonlyArray<Mac.Key>, webhookId: string, timestamp: number, body: string) => {
    const signed = encoder.encode(`${webhookId}.${timestamp}.${body}`)
    return Effect.forEach(keys, (key) => mac.sign(key, signed)).pipe(
      Effect.orDie,
      Effect.map((tags) => tags.map((tag) => `v1,${Base64.encode(tag)}`).join(" "))
    )
  }

  // One POST. The timestamp and signature are fresh on every attempt.
  const send = Effect.fnUntraced(function*(
    subscription: Subscription,
    body: string,
    webhookId: string,
    readBody: boolean
  ) {
    const admitted = yield* Effect.result(guard.check(subscription.url))
    if (Result.isFailure(admitted)) {
      return { _tag: "Failed", category: "connection_refused", retryable: true } satisfies Outcome
    }
    const now = yield* Clock.currentTimeMillis
    const timestamp = Math.floor(now / 1000)
    const previous = subscription.previous
    const keys = previous !== undefined && now < previous.until
      ? [subscription.secret.key, previous.key]
      : [subscription.secret.key]
    const request = HttpClientRequest.post(subscription.url).pipe(
      HttpClientRequest.setHeaders({
        "webhook-id": webhookId,
        "webhook-timestamp": String(timestamp),
        "webhook-signature": yield* sign(keys, webhookId, timestamp, body),
        "x-mcp-subscription-id": subscription.id
      }),
      HttpClientRequest.bodyText(body, "application/json")
    )
    const outcome = yield* client.execute(request).pipe(
      Effect.flatMap((response): Effect.Effect<Outcome, unknown> => {
        if (response.status < 200 || response.status >= 300) {
          return Effect.succeed({
            _tag: "Failed",
            category: statusCategory(response.status),
            retryable: response.status !== 410 && response.status !== 413
          })
        }
        return readBody
          ? Effect.map(readCapped(response), (text) => ({ _tag: "Delivered", body: text }))
          : Effect.succeed({ _tag: "Delivered", body: undefined })
      }),
      Effect.timeoutOption(Duration.millis(REQUEST_TIMEOUT_MS)),
      Effect.scoped,
      // `fetch` would follow a redirect itself; webhook delivery never does.
      Effect.provideService(FetchHttpClient.RequestInit, { redirect: "manual" }),
      // Trace ids stay inside: the endpoint belongs to someone else.
      Effect.provideService(HttpClient.TracerPropagationEnabled, false),
      Effect.catch((error) =>
        Effect.succeed(Option.some<Outcome>({ _tag: "Failed", category: transportCategory(error), retryable: true }))
      )
    )
    return Option.getOrElse(outcome, (): Outcome => ({ _tag: "Failed", category: "timeout", retryable: true }))
  })

  // Retries with backoff; gives up after a 410, a 413 or the last attempt. True once delivered.
  const deliver = Effect.fnUntraced(function*(subscription: Subscription, body: string, webhookId: string) {
    for (let attempt = 1;; attempt++) {
      // A subscription that ended may have been replaced under its id; this one speaks no longer.
      const current = subscriptions.get(subscription.id)
      if (current !== undefined && current !== subscription) return false
      const startedAt = yield* Clock.currentTimeMillis
      const outcome = yield* send(subscription, body, webhookId, false)
      if (outcome._tag === "Delivered") {
        subscription.lastDeliveryAt = yield* Clock.currentTimeMillis
        subscription.lastError = undefined
        return true
      }
      subscription.lastError = outcome.category
      if (!outcome.retryable || attempt >= MAX_ATTEMPTS) return false
      // Counted from the attempt's start, so a slow endpoint does not stretch the window.
      const wait = startedAt + FIRST_RETRY_MS * 2 ** (attempt - 1) - (yield* Clock.currentTimeMillis)
      if (wait > 0) yield* Effect.sleep(Duration.millis(wait))
    }
  })

  const control = (subscription: Subscription, type: string, fields: Readonly<Record<string, unknown>>) =>
    Effect.flatMap(
      messageId(`msg_${type}`),
      (webhookId) => deliver(subscription, JSON.stringify({ type, ...fields }), webhookId)
    )

  // One delivery in flight per subscription, so the watermark only moves forward
  // once everything before it is resolved.
  const run = (subscription: Subscription, name: string, events: McpCore.EventSubscription) =>
    events.items.pipe(
      Stream.runForEach((item): Effect.Effect<void> => {
        switch (item._tag) {
          case "Event":
            return Effect.flatMap(messageId("msg"), (webhookId) => {
              // `JSON.stringify` leaves out an absent `_meta`.
              const body = JSON.stringify({
                eventId: item.eventId,
                name,
                timestamp: item.timestamp,
                data: item.data,
                cursor: item.cursor,
                _meta: item._meta
              })
              return deliver(subscription, body, webhookId)
            }).pipe(Effect.andThen(Effect.sync(() => {
              subscription.watermark = item.cursor
            })))
          case "Position":
            return Effect.sync(() => {
              subscription.watermark = item.cursor
            })
          case "Gap":
            return control(subscription, "gap", { cursor: item.cursor }).pipe(
              Effect.map((delivered) => {
                // A delivered gap envelope reports every earlier gap too.
                subscription.gapPending = !delivered
                subscription.watermark = item.cursor
              })
            )
          case "Error":
            // A webhook has no envelope for an error that leaves the subscription open.
            return Effect.logWarning("Webhook delivery skipped a failed event", item.error)
        }
      }),
      // Ended before it says so, so a refresh meanwhile starts afresh instead of reporting it live.
      Effect.catch((failure) =>
        Effect.suspend(() => {
          forget(subscription)
          return control(subscription, "terminated", { error: wireError(failure) })
        })
      )
    )

  const expiry = Effect.fnUntraced(function*(subscription: Subscription) {
    while (true) {
      const left = subscription.expiresAt - (yield* Clock.currentTimeMillis)
      if (left <= 0) return forget(subscription)
      yield* Effect.raceFirst(Effect.sleep(Duration.millis(left)), Deferred.await(subscription.deadlineMoved))
    }
  })

  const handshake = Effect.fnUntraced(function*(subscription: Subscription) {
    const challenge = Base64Url.encode(yield* random.randomBytes(32))
    const outcome = yield* send(
      subscription,
      JSON.stringify({ type: "verification", challenge }),
      yield* messageId("msg_verification"),
      true
    )
    // The endpoint's answer is never reported, only that the challenge was not met.
    if (outcome._tag === "Failed") return yield* Effect.fail<FailureCategory>("challenge_failed")
    const echoed = outcome.body === undefined ? undefined : echoedChallenge(outcome.body)
    if (echoed === undefined || !Mac.timingSafeEqual(encoder.encode(echoed), encoder.encode(challenge))) {
      return yield* Effect.fail<FailureCategory>("challenge_failed")
    }
  })

  // Cached per (principal, url) either way; concurrent subscribes share one handshake.
  const verify: (
    subscription: Subscription
  ) => Effect.Effect<void, PublicMcpSchema.CallbackEndpointError | PublicMcpSchema.ResourceExhausted> = Effect
    .fnUntraced(function*(subscription: Subscription) {
      const key = JSON.stringify([subscription.principal, subscription.url.href])
      const now = yield* Clock.currentTimeMillis
      for (const [entry, { until }] of verifications) if (until <= now) verifications.delete(entry)
      const cached = verifications.get(key)
      if (cached !== undefined) {
        if (cached.failure === undefined) return
        return yield* callbackError(cached.failure)
      }
      const inFlight = verifying.get(key)
      if (inFlight !== undefined) {
        const exit = yield* Effect.exit(Deferred.await(inFlight))
        // The handshake ran on another request's fiber, and that request was cancelled.
        if (Exit.isFailure(exit) && Cause.hasInterruptsOnly(exit.cause)) return yield* verify(subscription)
        return yield* exit
      }
      const host = subscription.url.hostname
      const recent = (verificationsByHost.get(host) ?? []).filter((at) => at > now - MINUTE_MS)
      if (recent.length >= VERIFICATIONS_PER_HOST_PER_MINUTE) {
        verificationsByHost.set(host, recent)
        return yield* new PublicMcpSchema.ResourceExhausted({
          message: "Too many callback verifications for this host",
          data: { limit: "verifications", max: VERIFICATIONS_PER_HOST_PER_MINUTE }
        })
      }
      for (const [entry, times] of verificationsByHost) {
        if (times.every((at) => at <= now - MINUTE_MS)) verificationsByHost.delete(entry)
      }
      verificationsByHost.set(host, [...recent, now])
      const done = Deferred.makeUnsafe<void, PublicMcpSchema.CallbackEndpointError>()
      verifying.set(key, done)
      return yield* handshake(subscription).pipe(
        Effect.tap(() =>
          Effect.map(Clock.currentTimeMillis, (at) => {
            verifications.set(key, { until: at + VERIFIED_FOR_MS })
          })
        ),
        Effect.tapError((failure) =>
          Effect.map(Clock.currentTimeMillis, (at) => {
            verifications.set(key, { until: at + FAILED_FOR_MS, failure })
          })
        ),
        Effect.mapError(callbackError),
        Effect.onExit((exit) =>
          Effect.sync(() => {
            verifying.delete(key)
            Deferred.doneUnsafe(done, exit)
          })
        )
      )
    })

  // A caller that joins while the first subscribe's stream is opening waits for it and gets
  // where it started; one whose subscription went away meanwhile subscribes afresh.
  const refresh = Effect.fnUntraced(function*(
    request: SubscribeRequest,
    subscription: Subscription,
    secret: Secret,
    expiresAt: number,
    now: number
  ): Effect.fn.Return<SubscribeResult, McpCore.EventFailure | McpCore.RequestRejected> {
    const opening = !Deferred.isDoneUnsafe(subscription.accepted)
    const start = yield* Deferred.await(subscription.accepted)
    if (subscriptions.get(subscription.id) !== subscription) return yield* subscribe(request)
    if (subscription.secret.text !== secret.text) {
      subscription.previous = { key: subscription.secret.key, until: now + ROTATION_GRACE_MS }
      subscription.secret = secret
    }
    subscription.expiresAt = expiresAt
    const moved = subscription.deadlineMoved
    subscription.deadlineMoved = Deferred.makeUnsafe()
    Deferred.doneUnsafe(moved, Effect.void)
    if (opening) return { id: subscription.id, refreshBefore: iso(expiresAt), ...start }
    const truncated = subscription.gapPending
    subscription.gapPending = false
    return {
      id: subscription.id,
      refreshBefore: iso(expiresAt),
      cursor: subscription.watermark,
      truncated,
      deliveryStatus: {
        active: true,
        lastDeliveryAt: subscription.lastDeliveryAt === undefined ? null : iso(subscription.lastDeliveryAt),
        lastError: subscription.lastError ?? null
      }
    } satisfies SubscribeResult
  })

  const subscribe: Webhooks["subscribe"] = Effect.fnUntraced(function*(request) {
    const { principal } = request
    yield* checkMode(request.delivery)
    const url = yield* parseUrl(request.delivery.url, guard)
    const secret = yield* parseSecret(request.delivery.secret)
    const id = yield* subscriptionId(principal, url, request.name, request.arguments)
    const now = yield* Clock.currentTimeMillis
    const expiresAt = now + grantTtl(request.ttlMs)
    const live = subscriptions.get(id)
    if (live !== undefined) return yield* refresh(request, live, secret, expiresAt, now)
    // The slot is taken before anything asynchronous, so concurrent subscribes cannot pass the cap.
    const waiting = pending.get(principal) ?? 0
    let held = waiting
    for (const subscription of subscriptions.values()) if (subscription.principal === principal) held++
    if (held >= MAX_SUBSCRIPTIONS_PER_PRINCIPAL) {
      return yield* new PublicMcpSchema.ResourceExhausted({
        message: "Too many webhook subscriptions",
        data: { limit: "subscriptions", max: MAX_SUBSCRIPTIONS_PER_PRINCIPAL }
      })
    }
    pending.set(principal, waiting + 1)
    let reserved = true
    const release = () => {
      if (!reserved) return
      reserved = false
      const left = (pending.get(principal) ?? 1) - 1
      if (left === 0) pending.delete(principal)
      else pending.set(principal, left)
    }
    return yield* create(request, { principal, url, secret, id, expiresAt, now, release }).pipe(
      Effect.ensuring(Effect.sync(release))
    )
  })

  const create = Effect.fnUntraced(function*(
    request: SubscribeRequest,
    { expiresAt, id, now, principal, release, secret, url }: {
      readonly principal: string
      readonly url: URL
      readonly secret: Secret
      readonly id: string
      readonly expiresAt: number
      readonly now: number
      readonly release: () => void
    }
  ) {
    // One answer whether the host is private or does not resolve, so it reveals neither.
    yield* Effect.mapError(guard.check(url), () => invalid("delivery.url is not allowed"))
    const subscription: Subscription = {
      id,
      principal,
      url,
      secret,
      previous: undefined,
      expiresAt,
      watermark: request.cursor,
      lastDeliveryAt: undefined,
      lastError: undefined,
      fiber: undefined,
      deadlineMoved: Deferred.makeUnsafe(),
      accepted: Deferred.makeUnsafe(),
      gapPending: false
    }
    const decoded = yield* request.decode
    yield* verify(subscription)
    // From here the subscription counts itself, or a concurrent one already does.
    release()
    // A concurrent subscribe for the same key may have finished while this one verified.
    const raced = subscriptions.get(id)
    if (raced !== undefined) return yield* refresh(request, raced, secret, expiresAt, now)
    subscriptions.set(id, subscription)
    const { accepted } = subscription
    const lifetime = request.open(decoded, (events) =>
      Effect.suspend(() => {
        subscription.watermark = events.cursor
        return Deferred.succeed(accepted, { cursor: events.cursor, truncated: events.truncated })
      }).pipe(Effect.andThen(run(subscription, request.name, events)))).pipe(
        Effect.tapError((failure) => Deferred.fail(accepted, failure)),
        Effect.raceFirst(expiry(subscription)),
        Effect.ignore,
        Effect.ensuring(Effect.suspend(() => {
          forget(subscription)
          return Deferred.fail(accepted, new PublicMcpSchema.InternalError({ message: "The subscription ended" }))
        }))
      )
    // Forked from the request, so the event's stream keeps the request's services.
    subscription.fiber = yield* Effect.forkIn(lifetime, scope)
    const start = yield* Deferred.await(accepted)
    return { id, refreshBefore: iso(expiresAt), cursor: start.cursor, truncated: start.truncated }
  })

  const unsubscribe: Webhooks["unsubscribe"] = Effect.fnUntraced(function*(request) {
    const { principal } = request
    yield* checkMode(request.delivery)
    const url = yield* parseUrl(request.delivery.url, guard)
    const id = yield* subscriptionId(principal, url, request.name, request.arguments)
    const subscription = subscriptions.get(id)
    if (subscription === undefined) {
      return yield* new PublicMcpSchema.NotFound({
        message: "No webhook subscription matches",
        data: { kind: "subscription" }
      })
    }
    subscriptions.delete(id)
    if (subscription.fiber !== undefined) yield* Fiber.interrupt(subscription.fiber)
  })

  return { subscribe, unsubscribe } satisfies Webhooks
})
