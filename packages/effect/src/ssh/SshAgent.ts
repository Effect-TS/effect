/**
 * SSH agent protocol support.
 *
 * An `SshAgent` answers raw agent protocol requests. `make` talks to a running
 * agent (such as OpenSSH's `ssh-agent`) over a `Socket`, while `fromKeys`
 * serves in-memory keys. Both can be used for public key authentication and
 * agent forwarding.
 *
 * @stability experimental
 * @since 4.0.0
 */
import * as Context from "../Context.ts"
import * as Effect from "../Effect.ts"
import * as Layer from "../Layer.ts"
import * as Result from "../Result.ts"
import * as Semaphore from "../Semaphore.ts"
import * as Socket from "../socket/Socket.ts"
import { concat, equals, Reader, WireError, Writer } from "./internal/wire.ts"
import { SshAgentError, SshError } from "./SshError.ts"
import * as SshKey from "./SshKey.ts"

const AGENT_FAILURE = 5
const AGENTC_REQUEST_IDENTITIES = 11
const AGENT_IDENTITIES_ANSWER = 12
const AGENTC_SIGN_REQUEST = 13
const AGENT_SIGN_RESPONSE = 14
const AGENT_RSA_SHA2_256 = 2
const AGENT_RSA_SHA2_512 = 4

/**
 * Service for a source of SSH identities and signatures speaking the SSH
 * agent protocol.
 *
 * **Details**
 *
 * `request` exchanges one raw agent message (without the length prefix).
 * `identities` lists the agent's keys as `Signer`s whose `sign` delegates to
 * the agent, so private keys never leave it.
 *
 * @stability experimental
 * @category services
 * @since 4.0.0
 */
export class SshAgent extends Context.Service<SshAgent, {
  readonly request: (message: Uint8Array) => Effect.Effect<Uint8Array, SshError>
  readonly identities: Effect.Effect<ReadonlyArray<SshKey.Signer>, SshError>
  readonly sign: (
    key: SshKey.PublicKey,
    data: Uint8Array,
    algorithm: string
  ) => Effect.Effect<Uint8Array, SshError>
}>()("effect/ssh/SshAgent") {}

const agentError = (description: string, cause?: unknown) =>
  new SshError({ reason: new SshAgentError({ description, cause }) })

const decode = <A>(f: () => A): Effect.Effect<A, SshError> =>
  Effect.try({
    try: f,
    catch: (cause) => agentError(cause instanceof WireError ? cause.message : "malformed agent response", cause)
  })

/**
 * Creates an agent from a raw request handler, deriving `identities` and
 * `sign` from the agent protocol.
 *
 * @stability experimental
 * @category constructors
 * @since 4.0.0
 */
export const fromRequest = (
  request: (message: Uint8Array) => Effect.Effect<Uint8Array, SshError>
): SshAgent["Service"] => {
  const sign = (key: SshKey.PublicKey, data: Uint8Array, algorithm: string) =>
    Effect.gen(function*() {
      const flags = algorithm === "rsa-sha2-256"
        ? AGENT_RSA_SHA2_256
        : algorithm === "rsa-sha2-512"
        ? AGENT_RSA_SHA2_512
        : 0
      const response = yield* request(
        new Writer().byte(AGENTC_SIGN_REQUEST).string(key.blob).string(data).uint32(flags).finish()
      )
      if (response[0] !== AGENT_SIGN_RESPONSE) {
        return yield* agentError(`the agent refused to sign with ${algorithm}`)
      }
      return yield* decode(() => new Reader(response, 1).string())
    })
  const identities = Effect.gen(function*() {
    const response = yield* request(new Uint8Array([AGENTC_REQUEST_IDENTITIES]))
    if (response[0] !== AGENT_IDENTITIES_ANSWER) {
      return yield* agentError("the agent refused to list identities")
    }
    const keys = yield* decode(() => {
      const reader = new Reader(response, 1)
      const count = reader.uint32()
      const keys: Array<SshKey.PublicKey> = []
      for (let i = 0; i < count; i++) {
        const blob = reader.string()
        const comment = reader.utf8()
        const key = SshKey.fromBlob(blob, comment)
        if (Result.isSuccess(key)) keys.push(key.success)
      }
      return keys
    })
    return keys.map((publicKey): SshKey.Signer => ({
      publicKey,
      sign: (data, algorithm) => sign(publicKey, data, algorithm)
    }))
  })
  return SshAgent.of({ request, identities, sign })
}

/**
 * Creates an agent client that connects to a running SSH agent over a
 * `Socket`, such as the Unix socket named by `SSH_AUTH_SOCK`.
 *
 * **Details**
 *
 * Each request acquires a fresh connection through the socket's reader, so
 * the agent may be restarted between requests. Requests are serialized.
 *
 * **Example** (Connecting to `ssh-agent` on Node)
 *
 * ```ts skip-type-checking
 * import { NodeSocket } from "@effect/platform-node"
 * import { SshAgent } from "effect/ssh"
 *
 * const agent = SshAgent.make(
 *   yield* NodeSocket.makeNet({ path: process.env.SSH_AUTH_SOCK! })
 * )
 * ```
 *
 * @stability experimental
 * @category constructors
 * @since 4.0.0
 */
export const make = (socket: Socket.Socket): SshAgent["Service"] => {
  const lock = Semaphore.makeUnsafe(1)
  const request = (message: Uint8Array) =>
    Effect.gen(function*() {
      const pull = yield* Socket.readerBytes(socket)
      const writer = yield* socket.writer
      yield* writer.write(new Writer(message.length + 4).string(message).finish())
      const chunks: Array<Uint8Array> = []
      let received = 0
      let expected = -1
      while (expected < 0 || received < expected + 4) {
        const batch = yield* pull
        for (const chunk of batch) {
          chunks.push(chunk)
          received += chunk.length
        }
        if (expected < 0 && received >= 4) {
          expected = new Reader(concat(chunks)).uint32()
          if (expected === 0 || expected > 256 * 1024) {
            return yield* agentError(`invalid agent response length ${expected}`)
          }
        }
      }
      return concat(chunks).subarray(4, 4 + expected)
    }).pipe(
      Effect.scoped,
      Effect.catchTag("SocketError", (cause) => Effect.fail(agentError("could not reach the SSH agent", cause))),
      lock.withPermit
    )
  return fromRequest(request)
}

/**
 * Creates an in-memory agent that serves the given private keys.
 *
 * **When to use**
 *
 * Use to forward in-memory keys to a server through agent forwarding, or to
 * offer several keys through one authentication method.
 *
 * @stability experimental
 * @category constructors
 * @since 4.0.0
 */
export const fromKeys = (keys: ReadonlyArray<SshKey.PrivateKey>): SshAgent["Service"] =>
  fromRequest((message) =>
    Effect.gen(function*() {
      const failure = new Uint8Array([AGENT_FAILURE])
      switch (message[0]) {
        case AGENTC_REQUEST_IDENTITIES: {
          const writer = new Writer().byte(AGENT_IDENTITIES_ANSWER).uint32(keys.length)
          for (const key of keys) writer.string(key.publicKey.blob).string(key.publicKey.comment)
          return writer.finish()
        }
        case AGENTC_SIGN_REQUEST: {
          const parsed = yield* Effect.option(decode(() => {
            const reader = new Reader(message, 1)
            return { blob: reader.string(), data: reader.string(), flags: reader.uint32() }
          }))
          if (parsed._tag === "None") return failure
          const { blob, data, flags } = parsed.value
          const key = keys.find((key) => equals(key.publicKey.blob, blob))
          if (key === undefined) return failure
          const algorithm = key.type === "ssh-rsa"
            ? (flags & AGENT_RSA_SHA2_512 ? "rsa-sha2-512" : flags & AGENT_RSA_SHA2_256 ? "rsa-sha2-256" : undefined)
            : key.type
          if (algorithm === undefined) return failure
          const signature = yield* Effect.option(key.sign(data, algorithm))
          if (signature._tag === "None") return failure
          return new Writer().byte(AGENT_SIGN_RESPONSE).string(signature.value).finish()
        }
        default:
          return failure
      }
    })
  )

/**
 * Layer that provides an agent client connected through the context's
 * `Socket`.
 *
 * @stability experimental
 * @category layers
 * @since 4.0.0
 */
export const layer: Layer.Layer<SshAgent, never, Socket.Socket> = Layer.effect(
  SshAgent,
  Effect.gen(function*() {
    return make(yield* Socket.Socket)
  })
)
