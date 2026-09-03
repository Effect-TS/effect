import * as DenoRedis from "@effect/platform-deno/DenoRedis"
import { assert, describe, it } from "@effect/vitest"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Layer from "effect/Layer"
import * as Redis from "effect/unstable/persistence/Redis"

const encoder = new TextEncoder()
const decoder = new TextDecoder()
const channel = "fixture-channel"
const host = "redis.invalid"

function concat(a: Uint8Array, b: Uint8Array): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(a.length + b.length)
  out.set(a)
  out.set(b, a.length)
  return out
}

// Independent RESP2 framing oracle, not the driver's command encoder.
function resp(args: ReadonlyArray<string>): string {
  return `*${args.length}\r\n` + args.map((arg) => `$${encoder.encode(arg).length}\r\n${arg}\r\n`).join("")
}

function parseFrame(bytes: Uint8Array): { args: Array<string>; size: number } | undefined {
  let offset = 0
  const line = () => {
    for (let end = offset; end + 1 < bytes.length; end++) {
      if (bytes[end] === 13 && bytes[end + 1] === 10) {
        const value = decoder.decode(bytes.subarray(offset, end))
        offset = end + 2
        return value
      }
    }
  }
  const header = line()
  if (header === undefined) return
  if (!/^\*\d+$/.test(header)) throw new Error("Fixture: invalid array header")
  const args: Array<string> = []
  for (let i = 0; i < Number(header.slice(1)); i++) {
    const bulk = line()
    if (bulk === undefined) return
    if (!/^\$\d+$/.test(bulk)) throw new Error("Fixture: invalid bulk header")
    const length = Number(bulk.slice(1))
    if (offset + length + 2 > bytes.length) return
    args.push(decoder.decode(bytes.subarray(offset, offset + length)))
    offset += length
    if (bytes[offset] !== 13 || bytes[offset + 1] !== 10) throw new Error("Fixture: invalid bulk terminator")
    offset += 2
  }
  return { args, size: offset }
}

// Only the driver's read/write/close transport is replaced. The installed
// @db/redis parser, authentication, encoder and subscriber still run normally.
// All identities are fictional; no Redis server or environment is consulted.
class RespConn {
  readonly localAddr: Deno.NetAddr = { transport: "tcp", hostname: "fixture.invalid", port: 1 }
  readonly remoteAddr: Deno.NetAddr = { transport: "tcp", hostname: host, port: 6379 }
  readonly expectedAuth: ReadonlyArray<string> | undefined
  closed = false
  closeCalls = 0
  pendingReads = 0
  readonly frames: Array<{ args: Array<string>; raw: string }> = []
  readonly errors: Array<string> = []
  private input = new Uint8Array()
  private output = new Uint8Array()
  private wake: (() => void) | undefined
  private subscribed = false

  constructor(expectedAuth: ReadonlyArray<string> | undefined) {
    this.expectedAuth = expectedAuth
  }

  async read(buffer: Uint8Array): Promise<number | null> {
    this.pendingReads++
    try {
      while (!this.closed && this.output.length === 0) {
        await new Promise<void>((resolve) => {
          this.wake = resolve
        })
      }
      if (this.closed) return null
      const size = Math.min(buffer.length, this.output.length)
      buffer.set(this.output.subarray(0, size))
      this.output = this.output.slice(size)
      return size
    } finally {
      this.pendingReads--
    }
  }

  async write(buffer: Uint8Array): Promise<number> {
    if (this.closed) throw new Deno.errors.BadResource("fixture closed")
    this.input = concat(this.input, buffer)
    try {
      for (;;) {
        const frame = parseFrame(this.input)
        if (frame === undefined) break
        this.frames.push({ args: frame.args, raw: decoder.decode(this.input.subarray(0, frame.size)) })
        this.input = this.input.slice(frame.size)
        const [command, ...args] = frame.args
        if (command === "AUTH") {
          this.reply(
            JSON.stringify(frame.args) === JSON.stringify(this.expectedAuth)
              ? "+OK\r\n"
              : "-WRONGPASS invalid username-password pair\r\n"
          )
        } else if (command === "SUBSCRIBE" && args.length === 1 && args[0] === channel) {
          this.subscribed = true
          this.reply(`*3\r\n$9\r\nsubscribe\r\n$${channel.length}\r\n${channel}\r\n:1\r\n`)
        } else if (command === "PING" && args.length === 0) {
          this.reply(this.subscribed ? "*2\r\n$4\r\npong\r\n$0\r\n\r\n" : "+PONG\r\n")
        } else {
          throw new Error(`Fixture: unexpected command ${command}`)
        }
      }
    } catch (error) {
      this.errors.push(String(error))
      throw error
    }
    return buffer.length
  }

  private reply(value: string): void {
    this.output = concat(this.output, encoder.encode(value))
    this.wake?.()
    this.wake = undefined
  }

  close(): void {
    this.closeCalls++
    this.closed = true
    this.wake?.()
    this.wake = undefined
  }

  [Symbol.dispose](): void {
    this.close()
  }
}

interface CredentialCase {
  readonly id: string
  readonly options: DenoRedis.RedisOptions
  readonly auth?: ReadonlyArray<string>
  readonly rejected?: boolean
  readonly subscriber?: boolean
}

const reserved = ["AUTH", "app:user", "p@ss%"]
const explicit = { hostname: host, username: "app:user", password: "p@ss%" }
const encoded = { url: `redis://app%3Auser:p%40ss%25@${host}:6379` }
const query = { url: `redis://alice@${host}/?password=p%2540ss` }
const override = { ...encoded, username: "override%user", password: "override%password" }

const cases: ReadonlyArray<CredentialCase> = [
  { id: "explicit-reserved-identity", options: explicit, auth: reserved },
  {
    id: "plain-url-existing-undefined-password",
    options: { url: `redis://alice:secret@${host}`, password: undefined },
    auth: ["AUTH", "alice", "secret"]
  },
  {
    id: "encoded-authority-username",
    options: { url: `redis://app%3A%40%25:secret@${host}` },
    auth: ["AUTH", "app:@%", "secret"]
  },
  {
    id: "encoded-authority-password",
    options: { url: `redis://alice:p%3A%40%25@${host}` },
    auth: ["AUTH", "alice", "p:@%"]
  },
  { id: "encoded-authority-both", options: encoded, auth: reserved },
  {
    id: "authority-decodes-once",
    options: { url: `redis://app%2540user:p%2540ss@${host}` },
    auth: ["AUTH", "app%40user", "p%40ss"]
  },
  {
    id: "authority-literal-plus",
    options: { url: `redis://app+user:p+ss@${host}` },
    auth: ["AUTH", "app+user", "p+ss"]
  },
  {
    id: "query-password-already-decoded",
    options: { url: `redis://alice@${host}/?password=p%3A%40%25` },
    auth: ["AUTH", "alice", "p:@%"]
  },
  { id: "query-password-decodes-once", options: query, auth: ["AUTH", "alice", "p%40ss"] },
  {
    id: "query-plus-preserved-semantics",
    options: { url: `redis://alice@${host}/?password=p+ss%2B%25` },
    auth: ["AUTH", "alice", "p ss+%"]
  },
  {
    id: "authority-password-over-query",
    options: { url: `redis://alice:p%40ss@${host}/?password=ignored` },
    auth: ["AUTH", "alice", "p@ss"]
  },
  {
    id: "explicit-both-overrides-authority",
    options: override,
    auth: ["AUTH", "override%user", "override%password"]
  },
  {
    id: "explicit-password-overrides-only-password",
    options: { ...encoded, password: "literal%password" },
    auth: ["AUTH", "app:user", "literal%password"]
  },
  {
    id: "explicit-username-overrides-only-username",
    options: { ...encoded, username: "literal%username" },
    auth: ["AUTH", "literal%username", "p@ss%"]
  },
  {
    id: "undefined-overrides-retain-encoded-authority",
    options: { ...encoded, username: undefined, password: undefined },
    auth: reserved
  },
  {
    id: "encoded-password-only-auth",
    options: { url: `redis://:p%40ss%25@${host}` },
    auth: ["AUTH", "p@ss%"]
  },
  {
    id: "explicit-empty-password-authoritative",
    options: { ...encoded, username: "alice", password: "" },
    auth: ["AUTH", ""]
  },
  { id: "default-options-no-auth", options: {} },
  {
    id: "default-host-explicit-credentials",
    options: { username: "alice", password: "secret" },
    auth: ["AUTH", "alice", "secret"]
  },
  {
    id: "wrong-explicit-credentials-rejected",
    options: { ...explicit, password: "wrong" },
    auth: reserved,
    rejected: true
  },
  { id: "subscriber-explicit-reserved", options: explicit, auth: reserved, subscriber: true },
  { id: "subscriber-encoded-authority", options: encoded, auth: reserved, subscriber: true },
  { id: "subscriber-query-single-decode", options: query, auth: ["AUTH", "alice", "p%40ss"], subscriber: true },
  {
    id: "subscriber-explicit-overrides",
    options: override,
    auth: ["AUTH", "override%user", "override%password"],
    subscriber: true
  }
]

// Deno.connect is process-global: keep it installed until both client scopes close.
describe.sequential("DenoRedis credentials", () => {
  for (const test of cases) {
    it.live(test.id, () =>
      Effect.gen(function*() {
        const original = Deno.connect
        const originalTls = Deno.connectTls
        const peers: Array<RespConn> = []
        let mainClient: { isClosed: boolean } | undefined
        // The peer implements only the transport operations used by @db/redis.
        Deno.connect = (async (address: Deno.ConnectOptions) => {
          assert.strictEqual(address.hostname, test.options.url || test.options.hostname ? host : "localhost")
          assert.strictEqual(address.port, 6379)
          const peer = new RespConn(test.auth)
          peers.push(peer)
          return peer
        }) as unknown as typeof Deno.connect
        // A routing regression must fail rather than reach an unmocked network.
        Deno.connectTls = () => {
          throw new Error("Fixture: unexpected TLS connection")
        }
        try {
          // This inner scope deliberately closes before the lifetime assertions.
          const exit = yield* Effect.gen(function*() {
            const context = yield* Layer.build(DenoRedis.layer({ ...test.options, maxRetryCount: 0 }))
            const raw = Context.get(context, DenoRedis.DenoRedis)
            mainClient = raw.client
            assert.strictEqual(yield* raw.use((client) => client.ping()), "PONG")
            if (test.subscriber) {
              yield* Context.get(context, Redis.Redis).subscribe(channel)
            }
          }).pipe(Effect.scoped, Effect.exit)
          // Let already-queued iterator-finally microtasks run after scope release.
          yield* Effect.promise(async () => {
            await Promise.resolve()
            await Promise.resolve()
          })
          const reasons = Exit.isFailure(exit)
            ? exit.cause.reasons.map((reason) =>
              reason._tag === "Fail"
                ? { tag: reason._tag, error: reason.error._tag, cause: String(reason.error.cause) }
                : { tag: reason._tag }
            )
            : []
          assert.strictEqual(
            peers.every((peer) => peer.closed && peer.closeCalls === 1),
            true,
            "every peer closed once"
          )
          assert.strictEqual(peers.every((peer) => peer.pendingReads === 0), true, "no pending fixture reads")
          assert.deepStrictEqual(peers.flatMap((peer) => peer.errors), [], "no fixture errors")
          if (mainClient) assert.strictEqual(mainClient.isClosed, true)
          const actualAuth = peers.flatMap((peer) => peer.frames.filter((frame) => frame.args[0] === "AUTH"))
          if (test.rejected) {
            assert.deepStrictEqual(actualAuth.map((frame) => frame.args), [["AUTH", "app:user", "wrong"]])
            assert.strictEqual(exit._tag, "Failure")
            assert.strictEqual(reasons.length, 1)
            assert.deepStrictEqual(reasons[0], {
              tag: "Fail",
              error: "RedisError",
              cause: "Error: -WRONGPASS invalid username-password pair"
            })
          } else {
            const count = test.subscriber ? 2 : 1
            const auth = test.auth
            const expectedAuth = auth ? Array.from({ length: count }, () => auth) : []
            assert.deepStrictEqual(actualAuth.map((frame) => frame.args), expectedAuth, "actual AUTH tuples")
            assert.deepStrictEqual(actualAuth.map((frame) => frame.raw), expectedAuth.map(resp), "actual RESP bytes")
            assert.strictEqual(exit._tag, "Success", JSON.stringify(reasons))
            assert.strictEqual(peers.length, count)
            if (test.subscriber) {
              assert.deepStrictEqual(peers[1].frames.map((frame) => frame.args), [test.auth, ["SUBSCRIBE", channel], [
                "PING"
              ]])
            }
          }
        } finally {
          Deno.connect = original
          Deno.connectTls = originalTls
          const forcedCleanup = peers.filter((peer) => !peer.closed).length
          for (const peer of peers) if (!peer.closed) peer.close()
          assert.strictEqual(forcedCleanup, 0, "no fixture-forced cleanup permitted")
        }
      }))
  }
})
