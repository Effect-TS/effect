/** @internal */
import * as Cause from "../../Cause.ts"
import * as Clock from "../../Clock.ts"
import * as Context from "../../Context.ts"
import * as Aead from "../../crypto/Aead.ts"
import * as SecureRandom from "../../crypto/SecureRandom.ts"
import * as Duration from "../../Duration.ts"
import * as Effect from "../../Effect.ts"
import * as Base64Url from "../../encoding/Base64Url.ts"
import * as HttpServerRequest from "../../http/HttpServerRequest.ts"
import * as Layer from "../../Layer.ts"
import * as Option from "../../Option.ts"
import * as Predicate from "../../Predicate.ts"
import * as Result from "../../Result.ts"
import * as McpSchema from "../McpSchema.ts"
import type { RequestStateOptions } from "../McpServer.ts"
import type * as McpCore from "./mcpCore.ts"

/** @internal */
export const Principal = Context.Reference<string | undefined>("effect/ai/McpServer/RequestStatePrincipal", {
  defaultValue: () => undefined
})

type Identity = { readonly principal: string } | { readonly authorization: string } | undefined

interface Binding {
  readonly method: string
  readonly payload: unknown
}

/** @internal */
export interface Protection {
  readonly seal: (state: string, binding: Binding, identity: Identity) => Effect.Effect<string>
  readonly open: (
    state: string,
    binding: Binding,
    identity: Identity
  ) => Effect.Effect<string, McpSchema.InvalidParams>
}

/** @internal */
export class Protector extends Context.Service<Protector, Protection>()("effect/ai/internal/McpRequestState") {}

const encoder = new TextEncoder()
const invalidState = () => new McpSchema.InvalidParams({ message: "Invalid requestState" })

// JSON object member order is not meaningful, while array order is. Bind the
// canonical operation payload, not transport metadata or the retry's new ID.
const canonical = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(canonical)
  if (Predicate.isReadonlyObject(value)) {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]))
  }
  return value
}

const associatedData = (keyId: string, binding: Binding, identity: Identity) =>
  encoder.encode(JSON.stringify(canonical({
    domain: "effect/ai/mcp/request-state/v1",
    keyId,
    method: binding.method,
    parameters: binding.payload,
    identity: identity ?? null
  })))

const decode = (value: string) => {
  const bytes = Base64Url.decode(value)
  // Require the exact spelling we issued, including unused trailing bits.
  return Result.isSuccess(bytes) && Base64Url.encode(bytes.success) === value
    ? Effect.succeed(bytes.success)
    : Effect.fail(invalidState())
}

// https://modelcontextprotocol.io/specification/2026-07-28/basic/patterns/mrtr#server-requirements-basic-workflow
/** @internal */
export const make = (options?: RequestStateOptions): Effect.Effect<Protection, Cause.IllegalArgumentError> =>
  Effect.gen(function*() {
    const duration = Duration.fromInput(options?.ttl ?? "5 minutes")
    const ttl = Option.isSome(duration) ? Duration.toMillis(duration.value) : NaN
    if (!(ttl > 0) || !Number.isFinite(ttl) || ttl > Number.MAX_SAFE_INTEGER) {
      return yield* new Cause.IllegalArgumentError("MCP requestState ttl must be finite and positive")
    }
    const aead = yield* Aead.Aead
    const random = yield* SecureRandom.SecureRandom
    const entries = options?.keys ?? [{
      id: "default",
      key: yield* aead.generateKey(Aead.xchacha20Poly1305).pipe(Effect.orDie)
    }]
    const keys = new Map<string, Aead.Key>()
    for (const entry of entries) {
      const id = Base64Url.encode(entry.id)
      if (entry.id.length === 0 || keys.has(id) || !Aead.isKey(entry.key)) {
        return yield* new Cause.IllegalArgumentError("MCP requestState keys require unique non-empty IDs and Aead keys")
      }
      if (
        entry.key.algorithm.name !== "xchacha20Poly1305" || entry.key.algorithm.nonceLength !== 24 ||
        entry.key.algorithm.keyLength !== 32
      ) {
        return yield* new Cause.IllegalArgumentError("MCP requestState keys must use XChaCha20-Poly1305")
      }
      keys.set(id, entry.key)
    }
    const first = keys.entries().next().value
    if (first === undefined) {
      return yield* new Cause.IllegalArgumentError("MCP requestState keys must not be empty")
    }
    const [keyId, key] = first
    return Protector.of({
      seal: Effect.fnUntraced(function*(state, binding, identity) {
        const expiresAt = (yield* Clock.currentTimeMillis) + ttl
        const nonce = yield* random.randomBytes(key.algorithm.nonceLength).pipe(Effect.orDie)
        const ciphertext = yield* aead.encrypt(key, encoder.encode(JSON.stringify({ expiresAt, state })), {
          nonce,
          aad: associatedData(keyId, binding, identity)
        }).pipe(Effect.orDie)
        return `mcp1.${keyId}.${Base64Url.encode(nonce)}.${Base64Url.encode(ciphertext)}`
      }),
      open: Effect.fnUntraced(function*(state, binding, identity) {
        const parts = state.split(".")
        const key = keys.get(parts[1])
        if (parts.length !== 4 || parts[0] !== "mcp1" || key === undefined) {
          return yield* invalidState()
        }
        const nonce = yield* decode(parts[2])
        const ciphertext = yield* decode(parts[3])
        const plaintext = yield* aead.decrypt(key, ciphertext, {
          nonce,
          aad: associatedData(parts[1], binding, identity)
        }).pipe(Effect.mapError(invalidState))
        const parsed: unknown = yield* Effect.try({
          try: () => JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(plaintext)),
          catch: invalidState
        })
        if (
          !Predicate.isReadonlyObject(parsed) || typeof parsed.state !== "string" ||
          typeof parsed.expiresAt !== "number" || !Number.isFinite(parsed.expiresAt) ||
          (yield* Clock.currentTimeMillis) >= parsed.expiresAt
        ) {
          return yield* invalidState()
        }
        return parsed.state
      })
    })
  }).pipe(
    Effect.provide(Aead.layerWebCrypto.pipe(Layer.provideMerge(SecureRandom.layerWebCrypto)))
  )

/** @internal */
export const protect = <A, E, R>(
  handler: Effect.Effect<A, E, R>,
  invocation: McpCore.McpInvocation,
  binding: Binding
): Effect.Effect<A, E | McpSchema.InvalidParams, R | Protector> => {
  if (invocation.serverClient !== undefined) return handler
  return Effect.gen(function*() {
    const protector = yield* Protector
    const principal = yield* Principal
    const request = yield* Effect.serviceOption(HttpServerRequest.HttpServerRequest)
    const authorization = Option.isSome(request) ? request.value.headers.authorization : undefined
    // An explicit, verified identity survives credential refresh. Otherwise
    // bind the HTTP credential as an additional boundary, without treating it
    // as authenticated identity or exposing it in the token or error data.
    const identity: Identity = principal !== undefined
      ? { principal }
      : authorization !== undefined
      ? { authorization }
      : undefined
    const context = invocation.requestContext
    const result = yield* (context.requestState === undefined
      ? handler
      : Effect.provideService(handler, McpSchema.McpRequestContext, {
        ...context,
        requestState: yield* protector.open(context.requestState, binding, identity)
      }))
    return Predicate.isTagged(result, "InputRequired") &&
        Predicate.hasProperty(result, "requestState") && typeof result.requestState === "string"
      ? new McpSchema.InputRequired({
        ...result,
        requestState: yield* protector.seal(result.requestState, binding, identity)
      }) as A
      : result
  })
}
