import { assert, describe, layer } from "@effect/vitest"
import type * as Cause from "effect/Cause"
import * as Crypto from "effect/Crypto"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Queue from "effect/Queue"
import * as Socket from "effect/socket/Socket"
import { concat, Reader, utf8, Writer } from "effect/ssh/internal/wire"
import * as SshAgent from "effect/ssh/SshAgent"
import * as SshError from "effect/ssh/SshError"
import * as SshKey from "effect/ssh/SshKey"

// A `Crypto` service backed by the runtime's WebCrypto implementation.
const CryptoLive = Layer.succeed(
  Crypto.Crypto,
  Crypto.make({
    ...Crypto.makeSubtle(globalThis.crypto.subtle),
    randomBytes: (size) => globalThis.crypto.getRandomValues(new Uint8Array(size))
  })
)

const AGENT_FAILURE = 5
const AGENTC_REQUEST_IDENTITIES = 11
const AGENT_IDENTITIES_ANSWER = 12
const AGENTC_SIGN_REQUEST = 13
const AGENT_SIGN_RESPONSE = 14

const ed25519 = Effect.succeed(
  await Effect.runPromise(Effect.provide(SshKey.generate("ssh-ed25519", { comment: "ed25519 key" }), CryptoLive))
)
const ecdsa = Effect.succeed(
  await Effect.runPromise(Effect.provide(SshKey.generate("ecdsa-sha2-nistp384", { comment: "ecdsa key" }), CryptoLive))
)
const rsa = Effect.succeed(
  await Effect.runPromise(Effect.provide(SshKey.generate("ssh-rsa", { comment: "rsa key", bits: 2048 }), CryptoLive))
)
const keys = Effect.all([ed25519, ecdsa, rsa])

const data = utf8("session data")

const assertAgentError = (error: SshError.SshError, includes: string) => {
  assert.strictEqual(error._tag, "SshError")
  assert.strictEqual(error.reason._tag, "SshAgentError")
  assert.include(error.message, includes)
}

const signRequest = (blob: Uint8Array, payload: Uint8Array, flags: number) =>
  new Writer().byte(AGENTC_SIGN_REQUEST).string(blob).string(payload).uint32(flags).finish()

const signatureAlgorithm = (signature: Uint8Array) => new Reader(signature).utf8()

// -----------------------------------------------------------------------------
// In-memory agent socket
// -----------------------------------------------------------------------------

interface AgentSocket {
  readonly socket: Socket.Socket
  /** Number of reader acquisitions (connections). */
  readonly opened: () => number
  /** Number of connections whose scope has been closed. */
  readonly closed: () => number
  /** Highest number of simultaneously open connections. */
  readonly maxActive: () => number
  /** Raw bytes written by the client, per connection. */
  readonly written: Array<Uint8Array>
}

/**
 * Builds a `Socket` where every reader acquisition is a new connection that
 * serves one framed agent request by delegating to `agent.request`. The
 * response frame is delivered in chunks of `chunkSize` bytes, yielding between
 * chunks so the client has to reassemble it across pulls. A failing `respond`
 * closes the connection without an answer.
 */
const makeAgentSocket = (
  agent: SshAgent.SshAgent["Service"],
  options?: {
    readonly chunkSize?: number | undefined
    readonly respond?: ((payload: Uint8Array) => Effect.Effect<Uint8Array, SshError.SshError>) | undefined
    readonly endAfterResponse?: boolean | undefined
  }
): AgentSocket => {
  let opened = 0
  let closed = 0
  let active = 0
  let maxActive = 0
  const written: Array<Uint8Array> = []
  let current: Queue.Queue<Uint8Array, Cause.Done> | undefined
  const chunkSize = options?.chunkSize ?? 1024 * 1024
  const respond = options?.respond ??
    ((payload: Uint8Array) => Effect.map(agent.request(payload), (response) => new Writer().string(response).finish()))

  const socket = Socket.make({
    reader: Effect.gen(function*() {
      const toClient = yield* Queue.unbounded<Uint8Array, Cause.Done>()
      opened++
      active++
      maxActive = Math.max(maxActive, active)
      current = toClient
      yield* Effect.addFinalizer(() =>
        Effect.sync(() => {
          active--
          closed++
        })
      )
      return {
        pull: Queue.takeAll(toClient).pipe(
          Effect.catchCause(() =>
            Effect.fail(new Socket.SocketError({ reason: new Socket.SocketCloseError({ code: 1000 }) }))
          )
        ),
        upgrade: Socket.SocketUpgradeError.unsupported
      }
    }),
    writer: Effect.sync(() => {
      const toClient = current!
      const index = written.length
      written.push(new Uint8Array(0))
      let buffer = new Uint8Array(0)
      const onData = (chunk: Uint8Array) =>
        Effect.gen(function*() {
          written[index] = concat([written[index], chunk])
          buffer = concat([buffer, chunk])
          if (buffer.length < 4) return
          const length = new Reader(buffer).uint32()
          if (buffer.length < 4 + length) return
          const payload = buffer.slice(4, 4 + length)
          buffer = buffer.slice(4 + length)
          yield* Effect.forkDetach(
            Effect.gen(function*() {
              const frame = yield* respond(payload)
              for (let offset = 0; offset < frame.length; offset += chunkSize) {
                yield* Queue.offer(toClient, frame.slice(offset, offset + chunkSize))
                yield* Effect.yieldNow
              }
              if (options?.endAfterResponse === true) yield* Queue.end(toClient)
            }).pipe(Effect.catchCause(() => Queue.end(toClient)))
          )
        })
      return {
        write: (chunk: Uint8Array | string | Socket.CloseEvent) =>
          Socket.isCloseEvent(chunk)
            ? Effect.asVoid(Queue.end(toClient))
            : onData(typeof chunk === "string" ? utf8(chunk) : chunk),
        writeAll: (chunks: ReadonlyArray<Uint8Array | string | Socket.CloseEvent>) =>
          Effect.forEach(chunks, (chunk) =>
            Socket.isCloseEvent(chunk)
              ? Effect.asVoid(Queue.end(toClient))
              : onData(typeof chunk === "string" ? utf8(chunk) : chunk), { discard: true })
      }
    })
  })
  return {
    socket,
    opened: () => opened,
    closed: () => closed,
    maxActive: () => maxActive,
    written
  }
}

const verifyAll = (signers: ReadonlyArray<SshKey.Signer>) =>
  Effect.gen(function*() {
    for (const signer of signers) {
      for (const algorithm of SshKey.signatureAlgorithms(signer.publicKey.type)) {
        const signature = yield* signer.sign(data, algorithm)
        assert.strictEqual(signatureAlgorithm(signature), algorithm)
        assert.isTrue(yield* SshKey.verify(signer.publicKey, data, signature), algorithm)
        assert.isFalse(yield* SshKey.verify(signer.publicKey, utf8("other"), signature), algorithm)
      }
    }
  })

layer(CryptoLive, { excludeTestServices: true })("SshAgent", (it) => {
  describe("fromKeys", () => {
    it.effect("lists identities with comments", () =>
      Effect.gen(function*() {
        const privateKeys = yield* keys
        const agent = SshAgent.fromKeys(privateKeys)
        const identities = yield* agent.identities
        assert.strictEqual(identities.length, 3)
        for (let i = 0; i < privateKeys.length; i++) {
          assert.isTrue(SshKey.equals(identities[i].publicKey, privateKeys[i].publicKey))
          assert.strictEqual(identities[i].publicKey.type, privateKeys[i].type)
        }
        assert.deepStrictEqual(identities.map((identity) => identity.publicKey.comment), [
          "ed25519 key",
          "ecdsa key",
          "rsa key"
        ])
        assert.deepStrictEqual(yield* SshAgent.fromKeys([]).identities, [])
      }))

    it.effect("answers REQUEST_IDENTITIES with the wire format", () =>
      Effect.gen(function*() {
        const [key] = yield* keys
        const response = new Reader(
          yield* SshAgent.fromKeys([key]).request(new Uint8Array([AGENTC_REQUEST_IDENTITIES]))
        )
        assert.strictEqual(response.byte(), AGENT_IDENTITIES_ANSWER)
        assert.strictEqual(response.uint32(), 1)
        assert.deepStrictEqual(response.string(), key.publicKey.blob)
        assert.strictEqual(response.utf8(), "ed25519 key")
        assert.strictEqual(response.remaining, 0)
      }))

    it.effect("signs with every identity, including both RSA algorithms", () =>
      Effect.gen(function*() {
        const agent = SshAgent.fromKeys(yield* keys)
        const identities = yield* agent.identities
        yield* verifyAll(identities)
        const rsaIdentity = identities[2]
        assert.deepStrictEqual(SshKey.signatureAlgorithms(rsaIdentity.publicKey.type), ["rsa-sha2-512", "rsa-sha2-256"])
      }))

    it.effect("sign uses the request flags for RSA keys", () =>
      Effect.gen(function*() {
        const key = yield* rsa
        const agent = SshAgent.fromKeys([key])
        const response = (flags: number) =>
          Effect.map(agent.request(signRequest(key.publicKey.blob, data, flags)), (bytes) => new Reader(bytes))
        const sha256 = yield* response(2)
        assert.strictEqual(sha256.byte(), AGENT_SIGN_RESPONSE)
        const sha256Signature = sha256.string()
        assert.strictEqual(signatureAlgorithm(sha256Signature), "rsa-sha2-256")
        assert.isTrue(yield* SshKey.verify(key.publicKey, data, sha256Signature))

        const sha512 = yield* response(4)
        assert.strictEqual(sha512.byte(), AGENT_SIGN_RESPONSE)
        assert.strictEqual(signatureAlgorithm(sha512.string()), "rsa-sha2-512")

        // SHA-1 `ssh-rsa` signatures are not supported
        assert.deepStrictEqual(Array.from(yield* agent.request(signRequest(key.publicKey.blob, data, 0))), [
          AGENT_FAILURE
        ])
        assertAgentError(yield* Effect.flip(agent.sign(key.publicKey, data, "ssh-rsa")), "refused to sign with ssh-rsa")
      }))

    it.effect("fails for keys it does not hold", () =>
      Effect.gen(function*() {
        const [first, second] = yield* keys
        const agent = SshAgent.fromKeys([first])
        assertAgentError(
          yield* Effect.flip(agent.sign(second.publicKey, data, "ecdsa-sha2-nistp384")),
          "the agent refused to sign with ecdsa-sha2-nistp384"
        )
        assert.deepStrictEqual(Array.from(yield* agent.request(signRequest(second.publicKey.blob, data, 0))), [
          AGENT_FAILURE
        ])
      }))

    it.effect("returns the failure byte for unknown and malformed messages", () =>
      Effect.gen(function*() {
        const agent = SshAgent.fromKeys(yield* keys)
        for (const message of [[99], [0], [], [AGENTC_SIGN_REQUEST], [AGENTC_SIGN_REQUEST, 0, 0, 0, 9, 1]]) {
          assert.deepStrictEqual(Array.from(yield* agent.request(new Uint8Array(message))), [AGENT_FAILURE])
        }
      }))
  })

  describe("fromRequest", () => {
    it.effect("parses identities answers", () =>
      Effect.gen(function*() {
        const [first, second] = yield* keys
        const requests: Array<Uint8Array> = []
        const agent = SshAgent.fromRequest((message) =>
          Effect.sync(() => {
            requests.push(message)
            return new Writer()
              .byte(AGENT_IDENTITIES_ANSWER)
              .uint32(3)
              .string(first.publicKey.blob)
              .string("first")
              .string(new Uint8Array(0)) // invalid blob, skipped
              .string("invalid")
              .string(second.publicKey.blob)
              .string("")
              .finish()
          })
        )
        const identities = yield* agent.identities
        assert.deepStrictEqual(requests.map((request) => Array.from(request)), [[AGENTC_REQUEST_IDENTITIES]])
        assert.strictEqual(identities.length, 2)
        assert.isTrue(SshKey.equals(identities[0].publicKey, first.publicKey))
        assert.strictEqual(identities[0].publicKey.comment, "first")
        assert.isTrue(SshKey.equals(identities[1].publicKey, second.publicKey))
        assert.strictEqual(identities[1].publicKey.comment, "")
      }))

    it.effect("keeps identities of unsupported key types", () =>
      Effect.gen(function*() {
        const blob = new Writer().string("sk-ssh-ed25519@openssh.com").string(new Uint8Array(32)).string("ssh:")
          .finish()
        const agent = SshAgent.fromRequest(() =>
          Effect.succeed(new Writer().byte(AGENT_IDENTITIES_ANSWER).uint32(1).string(blob).string("fido").finish())
        )
        const [identity] = yield* agent.identities
        assert.strictEqual(identity.publicKey.type, "sk-ssh-ed25519@openssh.com")
        assert.strictEqual(identity.publicKey.comment, "fido")
      }))

    it.effect("fails when identities are refused or malformed", () =>
      Effect.gen(function*() {
        const respond = (response: Uint8Array) => SshAgent.fromRequest(() => Effect.succeed(response))
        assertAgentError(
          yield* Effect.flip(respond(new Uint8Array([AGENT_FAILURE])).identities),
          "the agent refused to list identities"
        )
        assertAgentError(
          yield* Effect.flip(respond(new Uint8Array(0)).identities),
          "the agent refused to list identities"
        )
        // count says one identity, but none follows
        assertAgentError(
          yield* Effect.flip(respond(new Uint8Array([AGENT_IDENTITIES_ANSWER, 0, 0, 0, 1])).identities),
          "SSH agent error"
        )
        assertAgentError(
          yield* Effect.flip(respond(new Uint8Array([AGENT_IDENTITIES_ANSWER, 0])).identities),
          "SSH agent error"
        )
      }))

    it.effect("encodes sign requests and parses sign responses", () =>
      Effect.gen(function*() {
        const [key] = yield* keys
        const requests: Array<Uint8Array> = []
        const signature = new Writer().string("ssh-ed25519").string(new Uint8Array(64).fill(7)).finish()
        const agent = SshAgent.fromRequest((message) =>
          Effect.sync(() => {
            requests.push(message)
            return new Writer().byte(AGENT_SIGN_RESPONSE).string(signature).finish()
          })
        )
        assert.deepStrictEqual(yield* agent.sign(key.publicKey, data, "ssh-ed25519"), signature)
        yield* agent.sign(key.publicKey, data, "rsa-sha2-256")
        yield* agent.sign(key.publicKey, data, "rsa-sha2-512")
        const [identity] = yield* SshAgent.fromRequest((message) =>
          message[0] === AGENTC_REQUEST_IDENTITIES
            ? Effect.succeed(
              new Writer().byte(AGENT_IDENTITIES_ANSWER).uint32(1).string(key.publicKey.blob).string("").finish()
            )
            : agent.request(message)
        ).identities
        assert.deepStrictEqual(yield* identity.sign(data, "ssh-ed25519"), signature)

        assert.strictEqual(requests.length, 4)
        const decoded = requests.map((request) => {
          const reader = new Reader(request)
          const result = { type: reader.byte(), blob: reader.string(), data: reader.string(), flags: reader.uint32() }
          assert.strictEqual(reader.remaining, 0)
          return result
        })
        for (const request of decoded) {
          assert.strictEqual(request.type, AGENTC_SIGN_REQUEST)
          assert.deepStrictEqual(request.blob, key.publicKey.blob)
          assert.deepStrictEqual(request.data, data)
        }
        assert.deepStrictEqual(decoded.map((request) => request.flags), [0, 2, 4, 0])
      }))

    it.effect("fails when signing is refused or the response is malformed", () =>
      Effect.gen(function*() {
        const [key] = yield* keys
        const respond = (response: Uint8Array) => SshAgent.fromRequest(() => Effect.succeed(response))
        assertAgentError(
          yield* Effect.flip(respond(new Uint8Array([AGENT_FAILURE])).sign(key.publicKey, data, "ssh-ed25519")),
          "the agent refused to sign with ssh-ed25519"
        )
        assertAgentError(
          yield* Effect.flip(respond(new Uint8Array([AGENT_IDENTITIES_ANSWER])).sign(key.publicKey, data, "x")),
          "the agent refused to sign with x"
        )
        assertAgentError(
          yield* Effect.flip(respond(new Uint8Array([AGENT_SIGN_RESPONSE, 0, 0, 0, 9])).sign(key.publicKey, data, "y")),
          "SSH agent error"
        )
      }))

    it.effect("propagates request failures", () =>
      Effect.gen(function*() {
        const [key] = yield* keys
        const failure = new SshError.SshError({ reason: new SshError.SshAgentError({ description: "boom" }) })
        const failing = SshAgent.fromRequest(() => Effect.fail(failure))
        assert.strictEqual(yield* Effect.flip(failing.identities), failure)
        assert.strictEqual(yield* Effect.flip(failing.sign(key.publicKey, data, "ssh-ed25519")), failure)
      }))
  })

  describe("make", () => {
    it.effect("frames requests and responses over the socket", () =>
      Effect.gen(function*() {
        const privateKeys = yield* keys
        const backend = makeAgentSocket(SshAgent.fromKeys(privateKeys))
        const agent = SshAgent.make(backend.socket)

        const response = yield* agent.request(new Uint8Array([AGENTC_REQUEST_IDENTITIES]))
        assert.strictEqual(response[0], AGENT_IDENTITIES_ANSWER)
        assert.deepStrictEqual(backend.written, [new Uint8Array([0, 0, 0, 1, AGENTC_REQUEST_IDENTITIES])])

        const identities = yield* agent.identities
        assert.deepStrictEqual(identities.map((identity) => identity.publicKey.comment), [
          "ed25519 key",
          "ecdsa key",
          "rsa key"
        ])
        yield* verifyAll(identities)
      }))

    it.effect("reassembles responses split across reads", () =>
      Effect.gen(function*() {
        const privateKeys = yield* keys
        for (const chunkSize of [1, 3, 5, 64]) {
          const backend = makeAgentSocket(SshAgent.fromKeys(privateKeys), { chunkSize })
          const agent = SshAgent.make(backend.socket)
          const identities = yield* agent.identities
          assert.strictEqual(identities.length, 3, `chunk size ${chunkSize}`)
          const rsaSignature = yield* identities[2].sign(data, "rsa-sha2-512")
          assert.isTrue(yield* SshKey.verify(privateKeys[2].publicKey, data, rsaSignature))
        }
      }))

    it.effect("ignores bytes after the response frame", () =>
      Effect.gen(function*() {
        const backend = makeAgentSocket(SshAgent.fromKeys([]), {
          respond: () => Effect.succeed(new Uint8Array([0, 0, 0, 1, AGENT_FAILURE, 1, 2, 3]))
        })
        const response = yield* SshAgent.make(backend.socket).request(new Uint8Array([99]))
        assert.deepStrictEqual(Array.from(response), [AGENT_FAILURE])
      }))

    it.effect("opens a new connection for every request", () =>
      Effect.gen(function*() {
        const backend = makeAgentSocket(SshAgent.fromKeys(yield* keys))
        const agent = SshAgent.make(backend.socket)
        const identities = yield* agent.identities
        assert.strictEqual(backend.opened(), 1)
        assert.strictEqual(backend.closed(), 1)
        yield* identities[0].sign(data, "ssh-ed25519")
        yield* identities[1].sign(data, "ecdsa-sha2-nistp384")
        yield* agent.request(new Uint8Array([99]))
        assert.strictEqual(backend.opened(), 4)
        assert.strictEqual(backend.closed(), 4)
        assert.strictEqual(backend.written.length, 4)
        for (const frame of backend.written) {
          assert.strictEqual(new Reader(frame).uint32(), frame.length - 4)
        }
      }))

    it.effect("serializes concurrent requests", () =>
      Effect.gen(function*() {
        const privateKeys = yield* keys
        const backend = makeAgentSocket(SshAgent.fromKeys(privateKeys), { chunkSize: 7 })
        const agent = SshAgent.make(backend.socket)
        const identities = yield* agent.identities
        const signatures = yield* Effect.forEach(
          [0, 1, 2, 0, 1, 2],
          (i) =>
            identities[i].sign(data, SshKey.signatureAlgorithms(identities[i].publicKey.type)[0]).pipe(
              Effect.map((signature) => [i, signature] as const)
            ),
          { concurrency: "unbounded" }
        )
        for (const [i, signature] of signatures) {
          assert.isTrue(yield* SshKey.verify(privateKeys[i].publicKey, data, signature))
        }
        assert.strictEqual(backend.opened(), 7)
        assert.strictEqual(backend.closed(), 7)
        assert.strictEqual(backend.maxActive(), 1)
      }))

    it.effect("rejects invalid response lengths", () =>
      Effect.gen(function*() {
        const zero = makeAgentSocket(SshAgent.fromKeys([]), { respond: () => Effect.succeed(new Uint8Array(4)) })
        assertAgentError(
          yield* Effect.flip(SshAgent.make(zero.socket).request(new Uint8Array([99]))),
          "invalid agent response length 0"
        )
        assert.strictEqual(zero.closed(), 1)

        const huge = makeAgentSocket(SshAgent.fromKeys([]), {
          respond: () => Effect.succeed(new Writer().uint32(256 * 1024 + 1).finish())
        })
        assertAgentError(
          yield* Effect.flip(SshAgent.make(huge.socket).request(new Uint8Array([99]))),
          `invalid agent response length ${256 * 1024 + 1}`
        )
      }))

    it.effect("maps socket errors to SshAgentError", () =>
      Effect.gen(function*() {
        const unreachable = Socket.make({
          reader: Effect.fail(
            new Socket.SocketError({ reason: new Socket.SocketOpenError({ kind: "Unknown", cause: "ENOENT" }) })
          ),
          writer: Effect.die("not reached")
        })
        const agent = SshAgent.make(unreachable)
        const error = yield* Effect.flip(agent.identities)
        assertAgentError(error, "could not reach the SSH agent")
        assert.strictEqual((error.reason as SshError.SshAgentError).cause instanceof Socket.SocketError, true)
        assertAgentError(yield* Effect.flip(agent.request(new Uint8Array([99]))), "could not reach the SSH agent")
      }))

    it.effect("maps connections closed before the response to SshAgentError", () =>
      Effect.gen(function*() {
        // the agent closes the connection without answering
        const silent = makeAgentSocket(SshAgent.fromKeys([]), { respond: () => Effect.fail(undefined as never) })
        assertAgentError(yield* Effect.flip(SshAgent.make(silent.socket).identities), "could not reach the SSH agent")
        assert.strictEqual(silent.closed(), 1)

        // the agent closes the connection after sending a partial frame
        const partial = makeAgentSocket(SshAgent.fromKeys([]), {
          respond: () => Effect.succeed(new Uint8Array([0, 0, 0, 10, AGENT_SIGN_RESPONSE])),
          endAfterResponse: true
        })
        assertAgentError(yield* Effect.flip(SshAgent.make(partial.socket).identities), "could not reach the SSH agent")
        assert.strictEqual(partial.closed(), 1)
      }))

    it.effect("recovers after a failed request", () =>
      Effect.gen(function*() {
        const privateKeys = yield* keys
        let attempt = 0
        const backend = makeAgentSocket(SshAgent.fromKeys(privateKeys), {
          respond: (payload) =>
            attempt++ === 0
              ? Effect.fail(undefined as never)
              : Effect.map(
                SshAgent.fromKeys(privateKeys).request(payload),
                (response) => new Writer().string(response).finish()
              )
        })
        const agent = SshAgent.make(backend.socket)
        assertAgentError(yield* Effect.flip(agent.identities), "could not reach the SSH agent")
        assert.strictEqual((yield* agent.identities).length, 3)
      }))
  })

  describe("layer", () => {
    it.effect("provides an agent connected through the Socket service", () =>
      Effect.gen(function*() {
        const backend = makeAgentSocket(SshAgent.fromKeys(yield* keys))
        const identities = yield* Effect.flatMap(SshAgent.SshAgent, (agent) => agent.identities).pipe(
          Effect.provide(SshAgent.layer.pipe(Layer.provide(Layer.succeed(Socket.Socket)(backend.socket))))
        )
        assert.strictEqual(identities.length, 3)
        assert.strictEqual(backend.opened(), 1)
      }))
  })
})
