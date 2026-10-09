import { assert, describe, it } from "@effect/vitest"
import * as Deferred from "effect/Deferred"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Fiber from "effect/Fiber"
import * as Queue from "effect/Queue"
import * as Socket from "effect/socket/Socket"
import { Reader, Writer } from "effect/ssh/internal/wire"
import * as SshAgent from "effect/ssh/SshAgent"
import * as SshClient from "effect/ssh/SshClient"
import type * as SshError from "effect/ssh/SshError"
import * as SshKey from "effect/ssh/SshKey"
import * as Stream from "effect/Stream"
import * as TestServer from "./utils/TestServer.ts"

const decoder = new TextDecoder()
const text = (stream: Stream.Stream<Uint8Array, SshError.SshError>) =>
  Effect.map(Stream.runCollect(stream), (chunks) => chunks.map((chunk) => decoder.decode(chunk)).join(""))

const hostKey = Effect.succeed(await Effect.runPromise(SshKey.generate("ssh-ed25519")))
const userKey = Effect.succeed(await Effect.runPromise(SshKey.generate("ssh-ed25519", { comment: "user" })))

/** Session handler implementing a few commands used by the tests. */
const shell: NonNullable<TestServer.ServerOptions["onSession"]> = (channel, start) =>
  Effect.gen(function*() {
    const [command, ...args] = start.value.split(" ")
    switch (command) {
      case "echo":
        yield* channel.write(args.join(" ") + "\n")
        yield* channel.exit(0)
        break
      case "stderr":
        yield* channel.writeStderr(args.join(" "))
        yield* channel.exit(1)
        break
      case "cat":
        yield* Stream.runForEach(Stream.fromQueue(channel.input), (chunk) => channel.write(chunk))
        yield* channel.exit(0)
        break
      case "count": {
        let total = 0
        yield* Stream.runForEach(Stream.fromQueue(channel.input), (chunk) =>
          Effect.sync(() => {
            total += chunk.length
          }))
        yield* channel.write(String(total))
        yield* channel.exit(0)
        break
      }
      case "big": {
        const size = Number(args[0])
        const chunk = new Uint8Array(8192).fill(97)
        for (let sent = 0; sent < size; sent += chunk.length) {
          yield* channel.write(chunk.subarray(0, Math.min(chunk.length, size - sent)))
        }
        yield* channel.exit(0)
        break
      }
      case "wait-signal": {
        const signal = yield* Queue.take(channel.signals)
        yield* channel.request("exit-signal", new Writer().string(signal).bool(false).string("").string("").finish())
        break
      }
      case "no-exit":
        break
      default:
        yield* channel.writeStderr(`unknown command ${command}`)
        yield* channel.exit(127)
    }
    yield* channel.eof
    yield* channel.close
  })

const connect = Effect.fnUntraced(function*(
  serverOptions: Partial<TestServer.ServerOptions> = {},
  clientOptions: Partial<SshClient.ConnectOptions> = {}
) {
  const key = yield* userKey
  const { server, socket } = yield* TestServer.runServer({
    hostKey: yield* hostKey,
    publicKeys: [key.publicKey],
    password: "secret",
    onSession: shell,
    ...serverOptions
  })
  const client = yield* SshClient.make(socket, {
    host: "test.local",
    username: "tester",
    auth: [SshClient.publicKey(key)],
    verifyHostKey: SshClient.acceptAnyHostKey,
    ...clientOptions
  })
  return { client, server: yield* server }
})

describe("SshClient", () => {
  describe("transport", () => {
    for (const kex of SshClient.defaultAlgorithms.kex) {
      it.effect(`negotiates ${kex}`, () =>
        Effect.gen(function*() {
          const { client } = yield* connect({ kex: [kex] })
          assert.strictEqual(client.algorithms.kex, kex)
          assert.strictEqual((yield* client.run("echo ok")).stdout, "ok\n")
        }))
    }

    for (const cipher of SshClient.defaultAlgorithms.cipher) {
      for (const mac of SshClient.defaultAlgorithms.mac) {
        it.effect(`negotiates ${cipher} with ${mac}`, () =>
          Effect.gen(function*() {
            const { client } = yield* connect({ ciphers: [cipher], macs: [mac] })
            assert.strictEqual(client.algorithms.cipherClientToServer, cipher)
            assert.strictEqual(
              client.algorithms.macClientToServer,
              cipher.includes("gcm") ? undefined : mac
            )
            assert.strictEqual((yield* client.run("echo ok")).stdout, "ok\n")
          }))
      }
    }

    const hostKeyCases: ReadonlyArray<readonly [SshKey.KeyType, string]> = [
      ["ssh-ed25519", "ssh-ed25519"],
      ["ecdsa-sha2-nistp256", "ecdsa-sha2-nistp256"],
      ["ecdsa-sha2-nistp384", "ecdsa-sha2-nistp384"],
      ["ecdsa-sha2-nistp521", "ecdsa-sha2-nistp521"],
      ["ssh-rsa", "rsa-sha2-512"],
      ["ssh-rsa", "rsa-sha2-256"]
    ]
    for (const [type, algorithm] of hostKeyCases) {
      it.effect(`verifies ${algorithm} host keys`, () =>
        Effect.gen(function*() {
          const key = yield* SshKey.generate(type, { bits: 2048 })
          const { client } = yield* connect({ hostKey: key, hostKeyAlgorithm: algorithm })
          assert.strictEqual(client.algorithms.hostKey, algorithm)
          assert.isTrue(SshKey.equals(client.hostKey, key.publicKey))
        }))
    }

    it.effect("ignores unsupported algorithm names", () =>
      Effect.gen(function*() {
        const { client } = yield* connect(
          { ciphers: ["chacha20-poly1305@openssh.com", "aes128-ctr"] },
          { algorithms: { cipher: ["chacha20-poly1305@openssh.com", "aes128-ctr"] } }
        )
        assert.strictEqual(client.algorithms.cipherClientToServer, "aes128-ctr")
      }))

    it.effect("fails negotiation without a common algorithm", () =>
      Effect.gen(function*() {
        const error = yield* Effect.flip(
          connect({ ciphers: ["aes256-ctr"] }, { algorithms: { cipher: ["aes128-ctr"] } })
        )
        assert.strictEqual(error.reason._tag, "SshNegotiationError")
      }))

    it.effect("skips banner lines before the server version", () =>
      Effect.gen(function*() {
        const { client } = yield* connect({ bannerLines: ["Welcome", "to the test server"] })
        assert.strictEqual(client.serverVersion, "SSH-2.0-EffectTestServer_1.0")
      }))

    it.effect("works without strict key exchange or ext-info", () =>
      Effect.gen(function*() {
        const { client } = yield* connect({ strictKex: false, extInfo: false })
        assert.strictEqual((yield* client.run("echo ok")).stdout, "ok\n")
      }))

    it.effect("re-keys when the client asks", () =>
      Effect.gen(function*() {
        const { client, server } = yield* connect()
        yield* client.rekey
        assert.strictEqual((yield* client.run("echo after")).stdout, "after\n")
        assert.strictEqual(server.kexCount(), 2)
      }))

    it.effect("re-keys when the server asks, while data is flowing", () =>
      Effect.gen(function*() {
        const { client, server } = yield* connect({}, { windowSize: 32 * 1024 })
        const session = yield* client.exec("big 2000000")
        const consumer = yield* Effect.forkChild(Stream.runFold(session.stdout, () => 0, (n, c) => n + c.length))
        yield* server.rekey
        assert.strictEqual(yield* Fiber.join(consumer), 2000000)
        assert.deepStrictEqual(yield* session.exit, { _tag: "ExitStatus", code: 0 })
        // Sending is gated until the exchange completes.
        assert.strictEqual((yield* client.run("echo after")).stdout, "after\n")
        assert.strictEqual(server.kexCount(), 2)
      }))

    it.effect("re-keys automatically after the byte limit", () =>
      Effect.gen(function*() {
        const { client, server } = yield* connect({}, { rekeyLimit: { bytes: 100_000 } })
        const result = yield* client.run("count", { stdin: new Uint8Array(400_000) })
        assert.strictEqual(result.stdout, "400000")
        assert.isAtLeast(server.kexCount(), 3)
      }))

    it.effect("reports server disconnects", () =>
      Effect.gen(function*() {
        const { client, server } = yield* connect()
        yield* server.disconnect(11, "maintenance")
        const error = yield* Effect.flip(client.closed)
        assert.strictEqual(error.reason._tag, "SshDisconnectError")
        if (error.reason._tag === "SshDisconnectError") {
          assert.strictEqual(error.reason.code, 11)
          assert.strictEqual(error.reason.description, "maintenance")
        }
      }))

    it.live("fails the handshake when it does not complete in time", () =>
      Effect.gen(function*() {
        const pipe = yield* TestServer.makePipe
        const error = yield* Effect.flip(SshClient.make(pipe.clientSocket, {
          host: "test.local",
          username: "tester",
          auth: [],
          verifyHostKey: SshClient.acceptAnyHostKey,
          handshakeTimeout: Duration.millis(50)
        }))
        assert.strictEqual(error.reason._tag, "SshTimeoutError")
      }))

    it.live("fails the connection when keep-alives go unanswered", () =>
      Effect.gen(function*() {
        const { client, server } = yield* connect({ answerKeepAlive: false }, {
          keepAlive: { interval: Duration.millis(20), maxMissed: 2 }
        })
        const error = yield* Effect.flip(client.closed)
        assert.strictEqual(error.reason._tag, "SshTimeoutError")
        assert.isTrue(server.globalRequests.includes("keepalive@openssh.com"))
      }))

    it.live("keeps the connection alive when keep-alives are answered", () =>
      Effect.gen(function*() {
        const { client, server } = yield* connect({}, { keepAlive: { interval: Duration.millis(10) } })
        yield* Effect.sleep(Duration.millis(80))
        assert.isAtLeast(server.globalRequests.filter((name) => name === "keepalive@openssh.com").length, 3)
        assert.strictEqual((yield* client.run("echo alive")).stdout, "alive\n")
      }))
  })

  describe("host keys", () => {
    it.effect("passes the verified host key to the verifier", () =>
      Effect.gen(function*() {
        const key = yield* hostKey
        const fingerprint = yield* SshKey.fingerprint(key.publicKey)
        let seen: SshClient.HostKeyInfo | undefined
        yield* connect({}, {
          port: 2200,
          verifyHostKey: (info) =>
            Effect.sync(() => {
              seen = info
            })
        })
        assert.strictEqual(seen?.host, "test.local")
        assert.strictEqual(seen?.port, 2200)
        assert.strictEqual(seen?.fingerprint, fingerprint)
      }))

    it.effect("accepts trusted fingerprints", () =>
      Effect.gen(function*() {
        const fingerprint = yield* SshKey.fingerprint((yield* hostKey).publicKey)
        const { client } = yield* connect({}, { verifyHostKey: SshClient.trustFingerprints([fingerprint]) })
        assert.strictEqual((yield* client.run("echo ok")).stdout, "ok\n")
      }))

    it.effect("rejects untrusted host keys", () =>
      Effect.gen(function*() {
        const error = yield* Effect.flip(connect({}, { verifyHostKey: SshClient.trustFingerprints("SHA256:nope") }))
        assert.strictEqual(error.reason._tag, "SshHostKeyError")
      }))

    it.effect("prefers host key algorithms the verifier knows", () =>
      Effect.gen(function*() {
        let preferred: ReadonlyArray<string> = []
        const verifier: SshClient.HostKeyVerifier = Object.assign(() => Effect.void, {
          keyTypes: () =>
            Effect.sync(() => {
              preferred = ["ecdsa-sha2-nistp256"]
              return preferred
            })
        })
        const key = yield* SshKey.generate("ecdsa-sha2-nistp256")
        const { client } = yield* connect({ hostKey: key }, { verifyHostKey: verifier })
        assert.deepStrictEqual(preferred, ["ecdsa-sha2-nistp256"])
        assert.strictEqual(client.algorithms.hostKey, "ecdsa-sha2-nistp256")
      }))
  })

  describe("authentication", () => {
    it.effect("authenticates with a public key", () =>
      Effect.gen(function*() {
        const { server } = yield* connect()
        assert.strictEqual(yield* Deferred.await(server.authenticated), "publickey")
      }))

    for (const type of ["ecdsa-sha2-nistp256", "ssh-rsa"] as const) {
      it.effect(`authenticates with a ${type} key`, () =>
        Effect.gen(function*() {
          const key = yield* SshKey.generate(type, { bits: 2048 })
          const { server } = yield* connect({ publicKeys: [key.publicKey] }, { auth: SshClient.publicKey(key) })
          assert.strictEqual(yield* Deferred.await(server.authenticated), "publickey")
        }))
    }

    it.effect("authenticates with a password", () =>
      Effect.gen(function*() {
        const { server } = yield* connect({}, { auth: SshClient.password("secret") })
        assert.strictEqual(yield* Deferred.await(server.authenticated), "password")
      }))

    it.effect("authenticates with keyboard-interactive", () =>
      Effect.gen(function*() {
        const prompts: Array<SshClient.KeyboardInteractivePrompt> = []
        const { server } = yield* connect({
          keyboardInteractive: {
            prompts: [{ prompt: "Password: ", echo: false }, { prompt: "Code: ", echo: true }],
            answers: ["secret", "123456"]
          }
        }, {
          auth: SshClient.keyboardInteractive((prompt) =>
            Effect.sync(() => {
              prompts.push(prompt)
              return ["secret", "123456"]
            })
          )
        })
        assert.strictEqual(yield* Deferred.await(server.authenticated), "keyboard-interactive")
        assert.deepStrictEqual(prompts[0].prompts.map((p) => p.prompt), ["Password: ", "Code: "])
        assert.deepStrictEqual(prompts[0].prompts.map((p) => p.echo), [false, true])
      }))

    it.effect("authenticates with an agent", () =>
      Effect.gen(function*() {
        const other = yield* SshKey.generate("ssh-ed25519")
        const agent = SshAgent.fromKeys([other, yield* userKey])
        const { server } = yield* connect({}, { auth: SshClient.agent(agent) })
        assert.strictEqual(yield* Deferred.await(server.authenticated), "publickey")
        // The unknown key is offered first and rejected.
        assert.isAtLeast(server.attempts.filter((method) => method === "publickey").length, 2)
      }))

    it.effect("falls back to the next method", () =>
      Effect.gen(function*() {
        const stranger = yield* SshKey.generate("ssh-ed25519")
        const { server } = yield* connect({}, {
          auth: [SshClient.publicKey(stranger), SshClient.password("secret")]
        })
        assert.strictEqual(yield* Deferred.await(server.authenticated), "password")
      }))

    it.effect("skips methods the server does not allow", () =>
      Effect.gen(function*() {
        const { server } = yield* connect({ methods: [["password"]] }, {
          auth: [SshClient.publicKey(yield* userKey), SshClient.password("secret")]
        })
        assert.strictEqual(yield* Deferred.await(server.authenticated), "password")
        assert.isFalse(server.attempts.includes("publickey"))
      }))

    it.effect("completes multi-factor authentication", () =>
      Effect.gen(function*() {
        const { server } = yield* connect({ methods: [["publickey", "password"]] }, {
          auth: [SshClient.publicKey(yield* userKey), SshClient.password("secret")]
        })
        assert.strictEqual(yield* Deferred.await(server.authenticated), "password")
      }))

    it.effect("reports exhausted methods", () =>
      Effect.gen(function*() {
        const error = yield* Effect.flip(connect({}, { auth: SshClient.password("wrong") }))
        assert.strictEqual(error.reason._tag, "SshAuthenticationError")
        if (error.reason._tag === "SshAuthenticationError") {
          assert.deepStrictEqual(error.reason.attemptedMethods, ["password"])
          assert.isTrue(error.reason.allowedMethods.includes("password"))
        }
      }))

    it.effect("delivers authentication banners", () =>
      Effect.gen(function*() {
        const banners: Array<string> = []
        yield* connect({ userauthBanner: "Authorized use only" }, {
          onBanner: (message) =>
            Effect.sync(() => {
              banners.push(message)
            })
        })
        assert.deepStrictEqual(banners, ["Authorized use only"])
      }))
  })

  describe("sessions", () => {
    it.effect("collects output and the exit status", () =>
      Effect.gen(function*() {
        const { client } = yield* connect()
        assert.deepStrictEqual(yield* client.run("echo hello world"), {
          stdout: "hello world\n",
          stderr: "",
          exit: { _tag: "ExitStatus", code: 0 }
        })
        assert.deepStrictEqual(yield* client.run("stderr oops"), {
          stdout: "",
          stderr: "oops",
          exit: { _tag: "ExitStatus", code: 1 }
        })
      }))

    it.effect("streams standard input", () =>
      Effect.gen(function*() {
        const { client } = yield* connect()
        const session = yield* client.exec("cat")
        const output = yield* Effect.forkChild(text(session.stdout))
        yield* Stream.make("a", "b", "c").pipe(
          Stream.map((value) => new TextEncoder().encode(value)),
          Stream.run(session.stdin)
        )
        assert.strictEqual(yield* Fiber.join(output), "abc")
      }))

    it.effect("respects the server window when sending", () =>
      Effect.gen(function*() {
        const { client } = yield* connect({ windowSize: 32 * 1024, maxPacketSize: 4096 })
        const result = yield* client.run("count", { stdin: new Uint8Array(1_000_000) })
        assert.strictEqual(result.stdout, "1000000")
      }))

    it.effect("returns window space as output is consumed", () =>
      Effect.gen(function*() {
        const { client } = yield* connect({}, { windowSize: 16 * 1024 })
        const session = yield* client.exec("big 1000000")
        const size = yield* Stream.runFold(session.stdout, () => 0, (n, chunk) => n + chunk.length)
        assert.strictEqual(size, 1_000_000)
      }))

    it.effect("delivers signals and reports signal exits", () =>
      Effect.gen(function*() {
        const { client } = yield* connect()
        const session = yield* client.exec("wait-signal")
        yield* session.signal("SIGTERM")
        assert.deepStrictEqual(yield* session.exit, {
          _tag: "ExitSignal",
          signal: "SIGTERM",
          coreDumped: false,
          message: ""
        })
      }))

    it.effect("fails exit when the channel closes without a status", () =>
      Effect.gen(function*() {
        const { client } = yield* connect()
        const session = yield* client.exec("no-exit")
        const error = yield* Effect.flip(session.exit)
        assert.strictEqual(error.reason._tag, "SshChannelError")
      }))

    it.effect("sends pty, env, and agent forwarding requests", () =>
      Effect.gen(function*() {
        let requests: Array<string> = []
        const { client } = yield* connect({
          onSession: (channel, start) =>
            Effect.gen(function*() {
              requests = channel.requests.map((request) => request.type)
              yield* shell(channel, start)
            })
        })
        yield* client.run("echo hi", { pty: { term: "vt100", columns: 120 }, env: { LANG: "C" }, forwardAgent: true })
        assert.deepStrictEqual(requests, ["auth-agent-req@openssh.com", "env", "pty-req", "exec"])
      }))

    it.effect("runs many sessions concurrently", () =>
      Effect.gen(function*() {
        const { client } = yield* connect()
        const results = yield* Effect.forEach(
          Array.from({ length: 20 }, (_, i) => i),
          (i) => Effect.map(client.run(`echo ${i}`), (result) => result.stdout),
          { concurrency: "unbounded" }
        )
        assert.deepStrictEqual(results, Array.from({ length: 20 }, (_, i) => `${i}\n`))
      }))

    it.effect("fails when the server rejects the request", () =>
      Effect.gen(function*() {
        const { client } = yield* connect()
        const session = yield* client.openChannel("session")
        assert.isFalse(yield* session.request("x11-req"))
      }))
  })

  describe("forwarding", () => {
    it.effect("opens direct-tcpip channels", () =>
      Effect.gen(function*() {
        const { client } = yield* connect({ onChannel: () => Effect.succeed(true) })
        const channel = yield* client.forwardOut({ host: "db.internal", port: 5432 })
        yield* channel.write("ping")
        yield* channel.eof
        assert.strictEqual(yield* text(channel.stdout), "ping")
      }))

    it.effect("exposes forwarded channels as sockets", () =>
      Effect.gen(function*() {
        const { client } = yield* connect({ onChannel: () => Effect.succeed(true) })
        const socket = client.forwardOutSocket({ socketPath: "/run/app.sock" })
        const pull = yield* Socket.readerBytes(socket)
        const writer = yield* socket.writer
        yield* writer.write(new TextEncoder().encode("over a socket"))
        const chunks = yield* pull
        assert.strictEqual(decoder.decode(chunks[0]), "over a socket")
      }))

    it.live("interrupts channel opens the server never answers", () =>
      Effect.gen(function*() {
        const { client } = yield* connect({ onChannel: () => Effect.never })
        const result = yield* client.forwardOut({ host: "db.internal", port: 5432 }).pipe(
          Effect.timeoutOption(Duration.millis(50))
        )
        assert.isTrue(result._tag === "None")
      }))

    it.effect("reports rejected channels", () =>
      Effect.gen(function*() {
        const { client } = yield* connect({ onChannel: () => Effect.succeed(false) })
        const error = yield* Effect.flip(client.forwardOut({ host: "db.internal", port: 5432 }))
        assert.strictEqual(error.reason._tag, "SshChannelOpenError")
      }))

    it.effect("accepts connections from remote forwards", () =>
      Effect.gen(function*() {
        const { client, server } = yield* connect()
        const forward = yield* client.forwardIn({ bindAddress: "127.0.0.1", port: 0 })
        assert.strictEqual(forward.port, 40000)
        const accepted = yield* Effect.forkChild(Stream.runHead(forward.connections))
        const serverChannel = yield* server.openChannel(
          "forwarded-tcpip",
          new Writer().string("127.0.0.1").uint32(forward.port).string("10.0.0.7").uint32(51515).finish()
        )
        const connection = yield* Effect.flatMap(Fiber.join(accepted), Effect.fromOption)
        assert.strictEqual(connection.originAddress, "10.0.0.7")
        assert.strictEqual(connection.originPort, 51515)
        yield* connection.channel.write("hello remote")
        const received = yield* Queue.take(serverChannel.input)
        assert.strictEqual(decoder.decode(received), "hello remote")
        yield* connection.channel.close
      }))

    it.effect("serves forwarded agent requests", () =>
      Effect.gen(function*() {
        const key = yield* userKey
        const { server } = yield* connect({}, { agentForwarding: SshAgent.fromKeys([key]) })
        const channel = yield* server.openChannel("auth-agent@openssh.com", new Uint8Array(0))
        yield* channel.write(new Writer().string(new Uint8Array([11])).finish())
        const response = yield* Queue.take(channel.input)
        const reader = new Reader(response)
        const message = new Reader(reader.string())
        assert.strictEqual(message.byte(), 12)
        assert.strictEqual(message.uint32(), 1)
        assert.isTrue(SshKey.equals(
          { blob: message.string() } as SshKey.PublicKey,
          key.publicKey
        ))
      }))
  })
})
