/**
 * Runs the `effect/ssh` client against a real OpenSSH `sshd` spawned for the
 * suite. The suite is skipped when `sshd` or `ssh-keygen` are unavailable (or
 * `sshd` cannot run unprivileged); the agent tests additionally need
 * `ssh-agent` and `ssh-add`.
 */
import { NodeServices, NodeSocket } from "@effect/platform-node"
import { afterAll, assert, beforeAll, describe, it } from "@effect/vitest"
import * as Cause from "effect/Cause"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Fiber from "effect/Fiber"
import * as FileSystem from "effect/FileSystem"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as ChildProcess from "effect/process/ChildProcess"
import { ChildProcessSpawner } from "effect/process/ChildProcessSpawner"
import * as Socket from "effect/socket/Socket"
import * as OpenSsh from "effect/ssh/OpenSsh"
import * as Sftp from "effect/ssh/Sftp"
import * as Ssh from "effect/ssh/Ssh"
import * as SshAgent from "effect/ssh/SshAgent"
import * as SshChildProcessSpawner from "effect/ssh/SshChildProcessSpawner"
import * as SshClient from "effect/ssh/SshClient"
import type * as SshError from "effect/ssh/SshError"
import * as SshKey from "effect/ssh/SshKey"
import * as SshKnownHosts from "effect/ssh/SshKnownHosts"
import * as Stream from "effect/Stream"
import * as NodeChildProcess from "node:child_process"
import * as NodeCrypto from "node:crypto"
import * as Fs from "node:fs"
import * as Net from "node:net"
import * as Os from "node:os"
import * as Path from "node:path"

// -----------------------------------------------------------------------------
// Tool detection
// -----------------------------------------------------------------------------

const which = (name: string): string | undefined => {
  const dirs = [...(process.env.PATH ?? "").split(Path.delimiter), "/usr/sbin", "/usr/local/sbin", "/sbin"]
  for (const dir of dirs) {
    if (dir === "") continue
    const candidate = Path.join(dir, name)
    try {
      Fs.accessSync(candidate, Fs.constants.X_OK)
      // sshd refuses to start unless invoked with an absolute path.
      return Fs.realpathSync(candidate)
    } catch {
      // keep looking
    }
  }
  return undefined
}

const bin = {
  sshd: which("sshd"),
  sshKeygen: which("ssh-keygen"),
  sshAgent: which("ssh-agent"),
  sshAdd: which("ssh-add"),
  ssh: which("ssh")
}

const baseConfig = (dir: string, port: number, hostKeys: ReadonlyArray<string>) => [
  `Port ${port}`,
  "ListenAddress 127.0.0.1",
  ...hostKeys.map((key) => `HostKey ${key}`),
  `PidFile ${Path.join(dir, "sshd.pid")}`,
  `AuthorizedKeysFile ${Path.join(dir, "authorized_keys")}`,
  "StrictModes no",
  "UsePAM no",
  "PasswordAuthentication no",
  "KbdInteractiveAuthentication no",
  "Subsystem sftp internal-sftp",
  "AllowTcpForwarding yes",
  "AllowStreamLocalForwarding yes",
  "AllowAgentForwarding yes",
  "AcceptEnv EFFECT_*",
  "MaxStartups 200",
  "MaxSessions 200",
  "LogLevel ERROR"
]

/**
 * Checks synchronously that sshd accepts an unprivileged configuration, and
 * whether it understands `PerSourcePenalties` (OpenSSH 9.8+).
 */
const probe = (): { readonly usable: boolean; readonly perSourcePenalties: boolean } => {
  if (process.platform === "win32" || bin.sshd === undefined || bin.sshKeygen === undefined) {
    return { usable: false, perSourcePenalties: false }
  }
  const dir = Fs.mkdtempSync(Path.join(Os.tmpdir(), "effect-sshd-probe-"))
  try {
    const key = Path.join(dir, "host_ed25519")
    NodeChildProcess.execFileSync(bin.sshKeygen, ["-q", "-t", "ed25519", "-N", "", "-f", key], { stdio: "ignore" })
    const test = (lines: ReadonlyArray<string>) => {
      const config = Path.join(dir, "sshd_config")
      Fs.writeFileSync(config, lines.join("\n") + "\n")
      try {
        NodeChildProcess.execFileSync(bin.sshd!, ["-t", "-f", config], { stdio: "ignore" })
        return true
      } catch {
        return false
      }
    }
    const base = baseConfig(dir, 2222, [key])
    if (test([...base, "PerSourcePenalties no"])) return { usable: true, perSourcePenalties: true }
    return { usable: test(base), perSourcePenalties: false }
  } catch {
    return { usable: false, perSourcePenalties: false }
  } finally {
    Fs.rmSync(dir, { recursive: true, force: true })
  }
}

const sshdProbe = probe()
const hasAgent = sshdProbe.usable && bin.sshAgent !== undefined && bin.sshAdd !== undefined

// -----------------------------------------------------------------------------
// Fixture
// -----------------------------------------------------------------------------

type HostKeyName = "ed25519" | "ecdsa" | "rsa"

interface HostKey {
  readonly path: string
  readonly line: string
  readonly key: SshKey.PublicKey
  readonly fingerprint: string
}

interface Fixture {
  readonly dir: string
  readonly port: number
  readonly username: string
  readonly sshd: NodeChildProcess.ChildProcess
  readonly logs: Array<string>
  readonly hostKeys: Record<HostKeyName, HostKey>
  readonly userKeys: Record<string, SshKey.PrivateKey>
  readonly unauthorizedKey: SshKey.PrivateKey
  readonly knownHosts: string
}

let fixture: Fixture | undefined
const getFixture = (): Fixture => {
  if (fixture === undefined) throw new Error("sshd fixture is not running")
  return fixture
}

const run = (file: string, args: ReadonlyArray<string>, env?: NodeJS.ProcessEnv): Promise<string> =>
  new Promise((resolve, reject) => {
    NodeChildProcess.execFile(file, args, { env: { ...process.env, ...env } }, (error, stdout, stderr) => {
      if (error) reject(new Error(`${file} ${args.join(" ")} failed: ${stderr}`, { cause: error }))
      else resolve(stdout)
    })
  })

const freePort = (): Promise<number> =>
  new Promise((resolve, reject) => {
    const server = Net.createServer()
    server.once("error", reject)
    server.listen(0, "127.0.0.1", () => {
      const port = (server.address() as Net.AddressInfo).port
      server.close(() => resolve(port))
    })
  })

const waitFor = async (description: string, check: () => Promise<boolean>, child?: NodeChildProcess.ChildProcess) => {
  const deadline = Date.now() + 15_000
  while (Date.now() < deadline) {
    if (child !== undefined && child.exitCode !== null) {
      throw new Error(`${description}: process exited with ${child.exitCode}`)
    }
    if (await check()) return
    await new Promise((resolve) => setTimeout(resolve, 25))
  }
  throw new Error(`${description}: timed out`)
}

const canConnect = (options: Net.NetConnectOpts) => () =>
  new Promise<boolean>((resolve) => {
    const socket = Net.createConnection(options)
    socket.once("connect", () => {
      socket.destroy()
      resolve(true)
    })
    socket.once("error", () => resolve(false))
  })

const stopProcess = async (child: NodeChildProcess.ChildProcess | undefined) => {
  if (child === undefined || child.exitCode !== null || child.signalCode !== null) return
  const exited = new Promise<void>((resolve) => child.once("exit", () => resolve()))
  child.kill("SIGTERM")
  const timer = setTimeout(() => child.kill("SIGKILL"), 3_000)
  await exited
  clearTimeout(timer)
}

const spawned = new Set<NodeChildProcess.ChildProcess>()
process.once("exit", () => {
  for (const child of spawned) child.kill("SIGKILL")
})

const spawnDaemon = (file: string, args: ReadonlyArray<string>, logs: Array<string>) => {
  const child = NodeChildProcess.spawn(file, args, { stdio: ["ignore", "pipe", "pipe"] })
  spawned.add(child)
  child.once("exit", () => spawned.delete(child))
  child.stdout!.on("data", (chunk) => logs.push(String(chunk)))
  child.stderr!.on("data", (chunk) => logs.push(String(chunk)))
  return child
}

const parsePublicKey = (text: string): SshKey.PublicKey => {
  const result = SshKey.parsePublicKey(text.trim())
  if (result._tag === "Failure") throw result.failure
  return result.success
}

const startSshd = async (): Promise<Fixture> => {
  const dir = Fs.realpathSync(Fs.mkdtempSync(Path.join(Os.tmpdir(), "effect-sshd-")))
  const logs: Array<string> = []
  let sshd: NodeChildProcess.ChildProcess | undefined
  try {
    const keygen = (name: string, ...args: Array<string>) =>
      run(bin.sshKeygen!, ["-q", "-N", "", "-C", name, "-f", Path.join(dir, name), ...args])
    const userKeyFiles = {
      "ed25519": ["-t", "ed25519"],
      "ecdsa-p256": ["-t", "ecdsa", "-b", "256"],
      "ecdsa-p384": ["-t", "ecdsa", "-b", "384"],
      "ecdsa-p521": ["-t", "ecdsa", "-b", "521"],
      "rsa": ["-t", "rsa", "-b", "2048"],
      "rsa-pem": ["-t", "rsa", "-b", "2048", "-m", "PEM"],
      "ecdsa-pkcs8": ["-t", "ecdsa", "-b", "256", "-m", "PKCS8"]
    } as const
    await Promise.all([
      keygen("host_ed25519", "-t", "ed25519"),
      keygen("host_ecdsa", "-t", "ecdsa", "-b", "256"),
      keygen("host_rsa", "-t", "rsa", "-b", "2048"),
      ...Object.entries(userKeyFiles).map(([name, args]) => keygen(`user_${name}`, ...args))
    ])

    const userKeys: Record<string, SshKey.PrivateKey> = {}
    for (const name of Object.keys(userKeyFiles)) {
      userKeys[name] = await Effect.runPromise(
        SshKey.parsePrivateKey(Fs.readFileSync(Path.join(dir, `user_${name}`), "utf8"))
      )
    }
    userKeys["generated-ed25519"] = await Effect.runPromise(SshKey.generate("ssh-ed25519", { comment: "gen" }))
    userKeys["generated-ecdsa-p384"] = await Effect.runPromise(SshKey.generate("ecdsa-sha2-nistp384"))
    userKeys["generated-rsa"] = await Effect.runPromise(SshKey.generate("ssh-rsa", { bits: 2048 }))
    const unauthorizedKey = await Effect.runPromise(SshKey.generate("ssh-ed25519"))

    Fs.writeFileSync(
      Path.join(dir, "authorized_keys"),
      Object.values(userKeys).map((key) => SshKey.formatPublicKey(key.publicKey)).join("\n") + "\n"
    )

    const port = await freePort()
    const hostKeys = {} as Record<HostKeyName, HostKey>
    for (const name of ["ed25519", "ecdsa", "rsa"] as const) {
      const path = Path.join(dir, `host_${name}`)
      const line = Fs.readFileSync(`${path}.pub`, "utf8").trim()
      const fingerprint = (await run(bin.sshKeygen!, ["-l", "-E", "sha256", "-f", `${path}.pub`])).split(" ")[1]
      hostKeys[name] = { path, line, key: parsePublicKey(line), fingerprint }
    }
    const knownHosts = Object.values(hostKeys)
      .map(({ line }) => `[127.0.0.1]:${port} ${line.split(" ").slice(0, 2).join(" ")}`)
      .join("\n") + "\n"

    const config = Path.join(dir, "sshd_config")
    Fs.writeFileSync(
      config,
      [
        ...baseConfig(dir, port, Object.values(hostKeys).map(({ path }) => path)),
        ...(sshdProbe.perSourcePenalties ? ["PerSourcePenalties no"] : [])
      ].join("\n") + "\n"
    )
    sshd = spawnDaemon(bin.sshd!, ["-D", "-e", "-f", config], logs)
    await waitFor("sshd", canConnect({ host: "127.0.0.1", port }), sshd)

    return {
      dir,
      port,
      username: Os.userInfo().username,
      sshd,
      logs,
      hostKeys,
      userKeys,
      unauthorizedKey,
      knownHosts
    }
  } catch (error) {
    await stopProcess(sshd)
    Fs.rmSync(dir, { recursive: true, force: true })
    throw new Error(`could not start sshd: ${logs.join("")}`, { cause: error })
  }
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

const decoder = new TextDecoder()
const encoder = new TextEncoder()

/** Runs a POSIX script regardless of the remote user's login shell. */
const sh = (script: string) => `exec sh -c ${SshChildProcessSpawner.quote(script)}`

const tmpPath = (name: string) => Path.join(getFixture().dir, `${name}-${NodeCrypto.randomBytes(4).toString("hex")}`)

const sha256 = (data: Uint8Array) => NodeCrypto.createHash("sha256").update(data).digest("hex")

const bytes = (stream: Stream.Stream<Uint8Array, SshError.SshError>) =>
  Effect.map(Stream.runCollect(stream), (chunks) => Buffer.concat(chunks))

const text = (stream: Stream.Stream<Uint8Array, SshError.SshError>) =>
  Effect.map(bytes(stream), (buffer) => decoder.decode(buffer))

const connect = (options: Partial<SshClient.ConnectOptions> = {}) =>
  Effect.gen(function*() {
    const { port, userKeys, username } = getFixture()
    const socket = yield* NodeSocket.makeNet({ host: "127.0.0.1", port })
    return yield* SshClient.make(socket, {
      host: "127.0.0.1",
      port,
      username,
      auth: SshClient.publicKey(userKeys["ed25519"]),
      verifyHostKey: SshKnownHosts.verifier(SshKnownHosts.parse(getFixture().knownHosts)),
      ...options
    })
  })

const ClientLayer = Layer.effect(SshClient.SshClient, Effect.suspend(() => connect()))
const SshLayer = Layer.effect(
  Ssh.Ssh,
  Effect.gen(function*() {
    return Ssh.fromClient(yield* SshClient.SshClient)
  })
).pipe(Layer.provide(ClientLayer))

const failure = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
  Effect.flatMap(Effect.exit(effect), (exit) => {
    if (Exit.isSuccess(exit)) return Effect.die(new Error("expected a failure"))
    const error = Cause.findErrorOption(exit.cause)
    if (Option.isNone(error)) return Effect.die(new Error(`expected a typed failure: ${Cause.pretty(exit.cause)}`))
    return Effect.succeed(error.value)
  })

const sshReason = <A, R>(effect: Effect.Effect<A, SshError.SshError, R>) =>
  Effect.map(failure(effect), (error) => error.reason)

/** A local TCP or Unix socket echo server. */
const echoServer = (listen: { readonly port: 0 } | { readonly path: string }) =>
  Effect.acquireRelease(
    Effect.callback<Net.Server>((resume) => {
      const server = Net.createServer({ allowHalfOpen: true }, (socket) => socket.pipe(socket))
      server.once("error", (error) => resume(Effect.die(error)))
      if ("path" in listen) server.listen(listen.path, () => resume(Effect.succeed(server)))
      else server.listen(0, "127.0.0.1", () => resume(Effect.succeed(server)))
    }),
    (server) => Effect.promise(() => new Promise<void>((resolve) => server.close(() => resolve())))
  ).pipe(Effect.map((server) => {
    const address = server.address()
    return typeof address === "string" ? 0 : address!.port
  }))

/** Connects with node:net, writes a payload, half-closes and collects the reply. */
const netRoundTrip = (options: Net.NetConnectOpts, payload: Uint8Array) =>
  Effect.promise(() =>
    new Promise<Buffer>((resolve, reject) => {
      const chunks: Array<Buffer> = []
      const socket = Net.createConnection({ ...options, allowHalfOpen: true })
      socket.on("data", (chunk: Buffer) => chunks.push(chunk))
      socket.once("error", reject)
      socket.once("end", () => {
        socket.end()
        resolve(Buffer.concat(chunks))
      })
      socket.once("connect", () => socket.end(payload))
    })
  )

/** Writes a payload to a channel, sends EOF and collects the reply. */
const channelRoundTrip = (channel: SshClient.SshChannel, payload: Uint8Array) =>
  Effect.gen(function*() {
    const reply = yield* Effect.forkChild(bytes(channel.stdout))
    yield* channel.write(payload)
    yield* channel.eof
    return yield* Fiber.join(reply)
  })

const echoChannel = (channel: SshClient.SshChannel) =>
  Stream.runForEach(channel.stdout, (chunk) => channel.write(chunk)).pipe(
    Effect.andThen(channel.eof),
    Effect.ensuring(channel.close),
    Effect.ignore
  )

const chunked = (data: Uint8Array, size: number): Array<Uint8Array> => {
  const out: Array<Uint8Array> = []
  for (let offset = 0; offset < data.length; offset += size) out.push(data.subarray(offset, offset + size))
  return out
}

const MiB = 1024 * 1024

// -----------------------------------------------------------------------------
// Tests
// -----------------------------------------------------------------------------

describe.skipIf(!sshdProbe.usable)("NodeSsh (OpenSSH integration)", { timeout: 60_000 }, () => {
  beforeAll(async () => {
    fixture = await startSshd()
  }, 60_000)

  afterAll(async () => {
    const current = fixture
    fixture = undefined
    if (current === undefined) return
    await stopProcess(current.sshd)
    Fs.rmSync(current.dir, { recursive: true, force: true })
  }, 30_000)

  describe("transport", () => {
    it.live("connects and reports the negotiated session", () =>
      Effect.gen(function*() {
        const client = yield* connect()
        assert.match(client.serverVersion, /^SSH-2\.0-OpenSSH_/)
        assert.isTrue(SshKey.equals(client.hostKey, getFixture().hostKeys.ed25519.key))
        assert.strictEqual(client.algorithms.hostKey, "ssh-ed25519")
        assert.isAbove(client.sessionId.length, 0)
        const result = yield* client.run("echo hello")
        assert.deepStrictEqual(result, { stdout: "hello\n", stderr: "", exit: { _tag: "ExitStatus", code: 0 } })
      }))

    for (const kex of SshClient.defaultAlgorithms.kex) {
      it.live(`key exchange ${kex}`, () =>
        Effect.gen(function*() {
          const client = yield* connect({ algorithms: { kex: [kex] } })
          assert.strictEqual(client.algorithms.kex, kex)
          assert.strictEqual((yield* client.run("echo ok")).stdout, "ok\n")
        }))
    }

    for (const cipher of SshClient.defaultAlgorithms.cipher) {
      it.live(`cipher ${cipher}`, () =>
        Effect.gen(function*() {
          const client = yield* connect({ algorithms: { cipher: [cipher] } })
          assert.strictEqual(client.algorithms.cipherClientToServer, cipher)
          assert.strictEqual(client.algorithms.cipherServerToClient, cipher)
          // Enough data for many packets in both directions.
          const payload = NodeCrypto.randomBytes(512 * 1024)
          const echoed = yield* Effect.scoped(Effect.flatMap(client.exec("cat"), (s) => channelRoundTrip(s, payload)))
          assert.strictEqual(sha256(echoed), sha256(payload))
        }))
    }

    for (const mac of SshClient.defaultAlgorithms.mac) {
      it.live(`mac ${mac} (with aes128-ctr)`, () =>
        Effect.gen(function*() {
          const client = yield* connect({ algorithms: { cipher: ["aes128-ctr"], mac: [mac] } })
          assert.strictEqual(client.algorithms.cipherClientToServer, "aes128-ctr")
          assert.strictEqual(client.algorithms.macClientToServer, mac)
          assert.strictEqual(client.algorithms.macServerToClient, mac)
          const payload = NodeCrypto.randomBytes(256 * 1024)
          const echoed = yield* Effect.scoped(Effect.flatMap(client.exec("cat"), (s) => channelRoundTrip(s, payload)))
          assert.strictEqual(sha256(echoed), sha256(payload))
        }))
    }

    const hostKeyCases: ReadonlyArray<readonly [algorithm: string, name: HostKeyName]> = [
      ["ssh-ed25519", "ed25519"],
      ["ecdsa-sha2-nistp256", "ecdsa"],
      ["rsa-sha2-512", "rsa"],
      ["rsa-sha2-256", "rsa"]
    ]
    for (const [algorithm, name] of hostKeyCases) {
      it.live(`host key ${algorithm}`, () =>
        Effect.gen(function*() {
          const expected = getFixture().hostKeys[name]
          let seen: SshClient.HostKeyInfo | undefined
          const client = yield* connect({
            algorithms: { hostKey: [algorithm] },
            verifyHostKey: (info) =>
              Effect.sync(() => {
                seen = info
              })
          })
          assert.strictEqual(client.algorithms.hostKey, algorithm)
          assert.isTrue(SshKey.equals(client.hostKey, expected.key))
          assert.strictEqual(seen?.fingerprint, expected.fingerprint)
          assert.strictEqual(seen?.host, "127.0.0.1")
          assert.strictEqual(seen?.port, getFixture().port)
          assert.strictEqual(yield* SshKey.fingerprint(client.hostKey), expected.fingerprint)
          assert.strictEqual((yield* client.run("echo ok")).stdout, "ok\n")
        }))
    }

    it.live("fails negotiation for a host key type the server does not have", () =>
      Effect.gen(function*() {
        const reason = yield* sshReason(connect({
          algorithms: { hostKey: ["ecdsa-sha2-nistp521"] },
          verifyHostKey: SshClient.acceptAnyHostKey
        }))
        assert.strictEqual(reason._tag, "SshNegotiationError")
      }))

    it.live("re-keys on request, including during a transfer", () =>
      Effect.gen(function*() {
        const client = yield* connect()
        yield* client.rekey
        assert.strictEqual((yield* client.run("echo after")).stdout, "after\n")
        const payload = NodeCrypto.randomBytes(4 * MiB)
        const session = yield* client.exec("cat")
        const reply = yield* Effect.forkChild(bytes(session.stdout))
        const chunks = chunked(payload, 64 * 1024)
        for (let i = 0; i < chunks.length; i++) {
          yield* session.write(chunks[i])
          if (i % 16 === 8) yield* client.rekey
        }
        yield* session.eof
        assert.strictEqual(sha256(yield* Fiber.join(reply)), sha256(payload))
        assert.deepStrictEqual(yield* session.exit, { _tag: "ExitStatus", code: 0 })
        yield* client.rekey
        yield* client.rekey
        assert.strictEqual((yield* client.run("echo again")).stdout, "again\n")
      }))

    it.live("re-keys automatically after rekeyLimit.bytes", () =>
      Effect.gen(function*() {
        const client = yield* connect({ rekeyLimit: { bytes: 128 * 1024 } })
        const payload = NodeCrypto.randomBytes(6 * MiB)
        const echoed = yield* Effect.scoped(Effect.flatMap(client.exec("cat"), (s) => channelRoundTrip(s, payload)))
        assert.strictEqual(sha256(echoed), sha256(payload))
        assert.strictEqual((yield* client.run("echo ok")).stdout, "ok\n")
      }))

    it.live("re-keys automatically after rekeyLimit.interval", () =>
      Effect.gen(function*() {
        const client = yield* connect({ rekeyLimit: { interval: "150 millis" } })
        for (let i = 0; i < 5; i++) {
          assert.strictEqual((yield* client.run(`echo ${i}`)).stdout, `${i}\n`)
          yield* Effect.sleep("100 millis")
        }
      }))

    it.live("sends keep-alives that OpenSSH answers", () =>
      Effect.gen(function*() {
        const client = yield* connect({ keepAlive: { interval: "100 millis", maxMissed: 2 } })
        const closed = yield* Effect.timeoutOption(Effect.exit(client.closed), "800 millis")
        assert.isTrue(Option.isNone(closed))
        assert.strictEqual((yield* client.run("echo alive")).stdout, "alive\n")
      }))

    it.live("answers global requests", () =>
      Effect.gen(function*() {
        const client = yield* connect()
        // OpenSSH replies to unknown requests with REQUEST_FAILURE.
        const reason = yield* sshReason(client.globalRequest("unknown-request@effect.website"))
        assert.strictEqual(reason._tag, "SshRequestError")
        assert.strictEqual((yield* client.run("echo ok")).stdout, "ok\n")
      }))

    it.live("multiplexes many concurrent channels", () =>
      Effect.gen(function*() {
        const client = yield* connect()
        const results = yield* Effect.forEach(
          Array.from({ length: 24 }, (_, i) => i),
          (i) => client.run(sh(`echo out-${i}; echo err-${i} >&2; exit ${i % 5}`)),
          { concurrency: "unbounded" }
        )
        results.forEach((result, i) => {
          assert.deepStrictEqual(result, {
            stdout: `out-${i}\n`,
            stderr: `err-${i}\n`,
            exit: { _tag: "ExitStatus", code: i % 5 }
          })
        })
      }))
  })

  describe("host key verification", () => {
    it.live("accepts the host key listed in known_hosts", () =>
      Effect.gen(function*() {
        for (const name of ["ed25519", "ecdsa", "rsa"] as const) {
          const { line } = getFixture().hostKeys[name]
          const knownHosts = `[127.0.0.1]:${getFixture().port} ${line.split(" ").slice(0, 2).join(" ")}\n`
          const client = yield* Effect.scoped(
            connect({ verifyHostKey: SshKnownHosts.verifier(SshKnownHosts.parse(knownHosts)) }).pipe(
              Effect.map((client) => ({ hostKey: client.hostKey, algorithm: client.algorithms.hostKey }))
            )
          )
          // The verifier's key types steer negotiation towards the known key.
          assert.isTrue(SshKey.equals(client.hostKey, getFixture().hostKeys[name].key))
          assert.strictEqual(
            client.algorithm,
            name === "ed25519" ? "ssh-ed25519" : name === "ecdsa" ? "ecdsa-sha2-nistp256" : "rsa-sha2-512"
          )
        }
      }))

    it.live("accepts hashed known_hosts entries produced by ssh-keygen -H", () =>
      Effect.gen(function*() {
        const file = tmpPath("known_hosts")
        yield* Effect.promise(async () => {
          Fs.writeFileSync(file, getFixture().knownHosts)
          await run(bin.sshKeygen!, ["-H", "-f", file])
        })
        const hashed = Fs.readFileSync(file, "utf8")
        assert.match(hashed, /^\|1\|/)
        const client = yield* connect({ verifyHostKey: SshKnownHosts.verifier(SshKnownHosts.parse(hashed)) })
        assert.strictEqual((yield* client.run("echo ok")).stdout, "ok\n")
      }))

    it.live("writes entries that ssh-keygen -F can find", () =>
      Effect.gen(function*() {
        const { port, hostKeys } = getFixture()
        const file = tmpPath("known_hosts")
        const plain = yield* SshKnownHosts.formatEntry("127.0.0.1", port, hostKeys.ed25519.key)
        const hashed = yield* SshKnownHosts.formatEntry("127.0.0.1", port, hostKeys.rsa.key, { hash: true })
        Fs.writeFileSync(file, `${plain}\n${hashed}\n`)
        const found = yield* Effect.promise(() => run(bin.sshKeygen!, ["-F", `[127.0.0.1]:${port}`, "-f", file]))
        assert.include(found, hostKeys.ed25519.line.split(" ")[1])
        assert.include(found, hostKeys.rsa.line.split(" ")[1])
      }))

    it.live("rejects a host key that does not match known_hosts", () =>
      Effect.gen(function*() {
        const other = yield* SshKey.generate("ssh-ed25519")
        const knownHosts = yield* SshKnownHosts.formatEntry("127.0.0.1", getFixture().port, other.publicKey)
        const reason = yield* sshReason(
          connect({
            algorithms: { hostKey: ["ssh-ed25519"] },
            verifyHostKey: SshKnownHosts.verifier(SshKnownHosts.parse(knownHosts))
          })
        )
        assert.strictEqual(reason._tag, "SshHostKeyError")
        if (reason._tag === "SshHostKeyError") {
          assert.strictEqual(reason.kind, "Mismatch")
          assert.strictEqual(reason.fingerprint, getFixture().hostKeys.ed25519.fingerprint)
        }
      }))

    it.live("rejects unknown and revoked host keys", () =>
      Effect.gen(function*() {
        const { hostKeys, port } = getFixture()
        const unknown = yield* sshReason(
          connect({ verifyHostKey: SshKnownHosts.verifier(SshKnownHosts.parse(`otherhost ${hostKeys.ed25519.line}`)) })
        )
        assert.strictEqual(unknown._tag === "SshHostKeyError" && unknown.kind, "Unknown")
        const revoked = yield* sshReason(connect({
          verifyHostKey: SshKnownHosts.verifier(
            SshKnownHosts.parse(`[127.0.0.1]:${port} ${hostKeys.ed25519.line}\n@revoked * ${hostKeys.ed25519.line}`)
          )
        }))
        assert.strictEqual(revoked._tag === "SshHostKeyError" && revoked.kind, "Revoked")
      }))

    it.live("trusts fingerprints reported by ssh-keygen -l", () =>
      Effect.gen(function*() {
        const { hostKeys } = getFixture()
        const client = yield* connect({ verifyHostKey: SshClient.trustFingerprints(hostKeys.ed25519.fingerprint) })
        assert.strictEqual((yield* client.run("echo ok")).stdout, "ok\n")
        const reason = yield* sshReason(connect({
          algorithms: { hostKey: ["ssh-ed25519"] },
          verifyHostKey: SshClient.trustFingerprints(hostKeys.rsa.fingerprint)
        }))
        assert.strictEqual(reason._tag === "SshHostKeyError" && reason.kind, "Mismatch")
      }))
  })

  describe("authentication", () => {
    const userKeyNames = [
      "ed25519",
      "ecdsa-p256",
      "ecdsa-p384",
      "ecdsa-p521",
      "rsa",
      "rsa-pem",
      "ecdsa-pkcs8",
      "generated-ed25519",
      "generated-ecdsa-p384",
      "generated-rsa"
    ]
    for (const name of userKeyNames) {
      it.live(`authenticates with a ${name} user key`, () =>
        Effect.gen(function*() {
          const client = yield* connect({ auth: SshClient.publicKey(getFixture().userKeys[name]) })
          assert.strictEqual((yield* client.run("echo ok")).stdout, "ok\n")
        }))
    }

    it.live("fails with an unauthorized key", () =>
      Effect.gen(function*() {
        const reason = yield* sshReason(connect({ auth: SshClient.publicKey(getFixture().unauthorizedKey) }))
        assert.strictEqual(reason._tag, "SshAuthenticationError")
        if (reason._tag === "SshAuthenticationError") {
          assert.include(reason.allowedMethods, "publickey")
          assert.notInclude(reason.allowedMethods, "password")
        }
      }))

    it.live("falls through methods the server rejects or does not allow", () =>
      Effect.gen(function*() {
        const client = yield* connect({
          auth: [
            SshClient.password("nope"),
            SshClient.publicKey(getFixture().unauthorizedKey),
            SshClient.publicKey(getFixture().userKeys["ecdsa-p256"])
          ]
        })
        assert.strictEqual((yield* client.run("echo ok")).stdout, "ok\n")
      }))
  })

  describe("sessions", () => {
    it.live("run collects stdout, stderr and exit codes", () =>
      Effect.gen(function*() {
        const client = yield* connect()
        const result = yield* client.run(sh("echo out; echo err >&2; exit 3"))
        assert.deepStrictEqual(result, { stdout: "out\n", stderr: "err\n", exit: { _tag: "ExitStatus", code: 3 } })
        const missing = yield* client.run(sh("command-that-does-not-exist-effect"))
        assert.deepStrictEqual(missing.exit, { _tag: "ExitStatus", code: 127 })
      }))

    it.live("run collects large stdout and stderr concurrently", () =>
      Effect.gen(function*() {
        const client = yield* connect()
        const result = yield* client.run(
          sh(
            "{ dd if=/dev/zero bs=65536 count=96 2>/dev/null; } >&2; i=0; while [ $i -lt 2000 ]; do echo 'äöü€😀'; i=$((i+1)); done"
          )
        )
        assert.strictEqual(result.stderr.length, 96 * 65536)
        assert.strictEqual(result.stdout, "äöü€😀\n".repeat(2000))
        assert.deepStrictEqual(result.exit, { _tag: "ExitStatus", code: 0 })
      }))

    it.live("run passes stdin", () =>
      Effect.gen(function*() {
        const client = yield* connect()
        const result = yield* client.run(sh("tr a-z A-Z"), { stdin: "hello stdin\n" })
        assert.strictEqual(result.stdout, "HELLO STDIN\n")
      }))

    it.live("streams stdin through the channel sink", () =>
      Effect.gen(function*() {
        const client = yield* connect()
        const session = yield* client.exec(sh("wc -c; cat >/dev/null"))
        const output = yield* Effect.forkChild(text(session.stdout))
        const chunks = Array.from({ length: 200 }, (_, i) => encoder.encode(`line ${i}\n`))
        const total = chunks.reduce((n, chunk) => n + chunk.length, 0)
        yield* Stream.run(Stream.fromIterable(chunks), session.stdin)
        assert.strictEqual((yield* Fiber.join(output)).trim(), String(total))
        assert.deepStrictEqual(yield* session.exit, { _tag: "ExitStatus", code: 0 })
      }))

    it.live("echoes interactive input line by line", () =>
      Effect.gen(function*() {
        const client = yield* connect()
        const session = yield* client.exec(sh("while read line; do echo \"got:$line\"; done"))
        const pull = yield* Stream.toPull(session.stdout)
        let received = ""
        for (const word of ["one", "two", "three"]) {
          yield* session.write(`${word}\n`)
          while (!received.includes(`got:${word}\n`)) {
            received += (yield* pull).map((chunk) => decoder.decode(chunk)).join("")
          }
        }
        yield* session.eof
        assert.strictEqual(received, "got:one\ngot:two\ngot:three\n")
        assert.deepStrictEqual(yield* session.exit, { _tag: "ExitStatus", code: 0 })
      }))

    it.live("allocates a pseudo-terminal", () =>
      Effect.gen(function*() {
        const client = yield* connect()
        const withoutPty = yield* client.run(sh("tty || true"))
        assert.strictEqual(withoutPty.stdout.trim(), "not a tty")
        const withPty = yield* client.run(sh("tty; stty size"), { pty: { columns: 132, rows: 43, term: "vt100" } })
        const lines = withPty.stdout.split(/\r?\n/)
        assert.match(lines[0], /^\/dev\//)
        assert.strictEqual(lines[1], "43 132")
        const term = yield* client.run(sh("echo $TERM"), { pty: { term: "vt100" } })
        assert.strictEqual(term.stdout.trim(), "vt100")
      }))

    it.live("reports terminal resizes", () =>
      Effect.gen(function*() {
        const client = yield* connect()
        const session = yield* client.exec(sh("stty -echo; stty size; read x; stty size"), { pty: true })
        const pull = yield* Stream.toPull(session.stdout)
        let received = ""
        while (!received.includes("24 80")) received += (yield* pull).map((c) => decoder.decode(c)).join("")
        yield* session.resize({ columns: 100, rows: 30 })
        yield* session.write("\n")
        while (!received.includes("30 100")) received += (yield* pull).map((c) => decoder.decode(c)).join("")
        assert.deepStrictEqual(yield* session.exit, { _tag: "ExitStatus", code: 0 })
      }))

    it.live("passes environment variables accepted by AcceptEnv", () =>
      Effect.gen(function*() {
        const client = yield* connect()
        const result = yield* client.run(sh("echo \"$EFFECT_TEST|${NOT_ACCEPTED_EFFECT:-unset}\""), {
          env: { EFFECT_TEST: "it works", NOT_ACCEPTED_EFFECT: "nope" }
        })
        assert.strictEqual(result.stdout, "it works|unset\n")
      }))

    it.live("delivers signals and reports ExitSignal", () =>
      Effect.gen(function*() {
        const client = yield* connect()
        const session = yield* client.exec(sh("echo started; exec sleep 30"))
        const pull = yield* Stream.toPull(session.stdout)
        assert.strictEqual(decoder.decode((yield* pull)[0]), "started\n")
        yield* session.signal("SIGTERM")
        const exit = yield* session.exit
        assert.strictEqual(exit._tag, "ExitSignal")
        if (exit._tag === "ExitSignal") assert.strictEqual(exit.signal, "SIGTERM")
      }))

    it.live("reports processes killed by a signal", () =>
      Effect.gen(function*() {
        const client = yield* connect()
        const result = yield* client.run(sh("kill -KILL $$"))
        assert.strictEqual(result.exit._tag, "ExitSignal")
        if (result.exit._tag === "ExitSignal") assert.strictEqual(result.exit.signal, "SIGKILL")
      }))

    it.live("opens an interactive shell", () =>
      Effect.gen(function*() {
        const client = yield* connect()
        const session = yield* client.shell()
        const output = yield* Effect.forkChild(text(session.stdout))
        yield* session.write("echo from-shell\nexit 7\n")
        yield* session.eof
        assert.include(yield* Fiber.join(output), "from-shell")
        assert.deepStrictEqual(yield* session.exit, { _tag: "ExitStatus", code: 7 })
      }))

    it.live("uploads tens of megabytes", () =>
      Effect.gen(function*() {
        const client = yield* connect()
        const file = tmpPath("upload")
        const payload = NodeCrypto.randomBytes(32 * MiB)
        const session = yield* client.exec(sh(`cat > ${file}`))
        yield* Stream.run(Stream.fromIterable(chunked(payload, 256 * 1024)), session.stdin)
        assert.deepStrictEqual(yield* session.exit, { _tag: "ExitStatus", code: 0 })
        assert.strictEqual(sha256(Fs.readFileSync(file)), sha256(payload))
      }))

    it.live("downloads tens of megabytes", () =>
      Effect.gen(function*() {
        const client = yield* connect()
        const file = tmpPath("download")
        const payload = NodeCrypto.randomBytes(32 * MiB)
        Fs.writeFileSync(file, payload)
        const session = yield* client.exec(`cat ${file}`)
        const hash = NodeCrypto.createHash("sha256")
        let size = 0
        yield* Stream.runForEach(session.stdout, (chunk) =>
          Effect.sync(() => {
            size += chunk.length
            hash.update(chunk)
          }))
        assert.strictEqual(size, payload.length)
        assert.strictEqual(hash.digest("hex"), sha256(payload))
        assert.deepStrictEqual(yield* session.exit, { _tag: "ExitStatus", code: 0 })
      }))
  })

  describe("forwarding", () => {
    it.live("forwardOut reaches a TCP server through sshd", () =>
      Effect.gen(function*() {
        const port = yield* echoServer({ port: 0 })
        const client = yield* connect()
        const payload = NodeCrypto.randomBytes(2 * MiB)
        const channel = yield* client.forwardOut({ host: "127.0.0.1", port })
        assert.strictEqual(channel.type, "direct-tcpip")
        assert.strictEqual(sha256(yield* channelRoundTrip(channel, payload)), sha256(payload))
        yield* channel.close
      }))

    it.live("forwardOut fails when the target refuses the connection", () =>
      Effect.gen(function*() {
        const client = yield* connect()
        const port = yield* Effect.promise(freePort)
        const reason = yield* sshReason(Effect.scoped(client.forwardOut({ host: "127.0.0.1", port })))
        assert.strictEqual(reason._tag, "SshChannelOpenError")
        assert.strictEqual((yield* client.run("echo ok")).stdout, "ok\n")
      }))

    it.live("forwardOut reaches a Unix socket through sshd", () =>
      Effect.gen(function*() {
        const path = tmpPath("echo.sock")
        yield* echoServer({ path })
        const client = yield* connect()
        const channel = yield* client.forwardOut({ socketPath: path })
        assert.strictEqual(decoder.decode(yield* channelRoundTrip(channel, encoder.encode("over unix"))), "over unix")
      }))

    it.live("forwardOutSocket exposes a forward as a Socket", () =>
      Effect.gen(function*() {
        const port = yield* echoServer({ port: 0 })
        const client = yield* connect()
        const socket = client.forwardOutSocket({ host: "127.0.0.1", port })
        const pull = yield* Socket.readerBytes(socket)
        const writer = yield* socket.writer
        let received = ""
        for (const message of ["ping", "pong", "done"]) {
          yield* writer.write(message)
          while (!received.endsWith(message)) {
            received += (yield* pull).map((chunk) => decoder.decode(chunk)).join("")
          }
        }
        assert.strictEqual(received, "pingpongdone")
      }))

    /** A local listener whose first accepted connection is returned. */
    const acceptOne = Effect.gen(function*() {
      const accepted = Promise.withResolvers<Net.Socket>()
      const listener = Net.createServer({ allowHalfOpen: true }, (socket) => accepted.resolve(socket))
      yield* Effect.acquireRelease(
        Effect.promise(() => new Promise<void>((resolve) => listener.listen(0, "127.0.0.1", () => resolve()))),
        () => Effect.sync(() => listener.close())
      )
      return { port: (listener.address() as Net.AddressInfo).port, accepted: accepted.promise }
    })

    it.live("forwardSocket pipes a local socket to a target (half-close)", () =>
      Effect.gen(function*() {
        const echoPort = yield* echoServer({ port: 0 })
        const client = yield* connect()
        const { accepted, port } = yield* acceptOne
        // The peer half-closes before reading the reply, so the local socket
        // must allow half-open connections (Node ends it otherwise).
        const local = yield* NodeSocket.makeNet({ host: "127.0.0.1", port, allowHalfOpen: true })
        const forwarding = yield* Effect.forkChild(client.forwardSocket(local, { host: "127.0.0.1", port: echoPort }))
        const payload = NodeCrypto.randomBytes(1 * MiB)
        const reply = yield* Effect.promise(() =>
          accepted.then((socket) =>
            new Promise<Buffer>((resolve, reject) => {
              const chunks: Array<Buffer> = []
              socket.on("data", (chunk: Buffer) => chunks.push(chunk))
              socket.once("error", reject)
              socket.once("end", () => {
                socket.end()
                resolve(Buffer.concat(chunks))
              })
              socket.end(payload)
            })
          )
        )
        assert.strictEqual(sha256(reply), sha256(payload))
        yield* Fiber.join(forwarding)
      }))

    it.live("forwardSocket pipes a local socket to a target (request/response)", () =>
      Effect.gen(function*() {
        const echoPort = yield* echoServer({ port: 0 })
        const client = yield* connect()
        const { accepted, port } = yield* acceptOne
        const local = yield* NodeSocket.makeNet({ host: "127.0.0.1", port })
        const forwarding = yield* Effect.forkChild(client.forwardSocket(local, { host: "127.0.0.1", port: echoPort }))
        const payload = NodeCrypto.randomBytes(1 * MiB)
        const reply = yield* Effect.promise(() =>
          accepted.then((socket) =>
            new Promise<Buffer>((resolve, reject) => {
              const chunks: Array<Buffer> = []
              let size = 0
              socket.on("data", (chunk: Buffer) => {
                chunks.push(chunk)
                size += chunk.length
                if (size >= payload.length) {
                  socket.end()
                  resolve(Buffer.concat(chunks))
                }
              })
              socket.once("error", reject)
              socket.write(payload)
            })
          )
        )
        assert.strictEqual(sha256(reply), sha256(payload))
        // Closing the local side ends the forward.
        yield* Fiber.join(forwarding)
      }))

    it.live("forwardIn forwards remote TCP connections back to the client", () =>
      Effect.gen(function*() {
        const client = yield* connect()
        const forward = yield* client.forwardIn({ bindAddress: "127.0.0.1", port: 0 })
        assert.isAbove(forward.port, 0)
        yield* Effect.forkChild(
          Stream.runForEach(forward.connections, (connection) => Effect.forkChild(echoChannel(connection.channel)))
        )
        // A plain TCP client connecting to the remote listener.
        const reply = yield* netRoundTrip({ host: "127.0.0.1", port: forward.port }, encoder.encode("from tcp"))
        assert.strictEqual(decoder.decode(reply), "from tcp")
        // The same listener reached through the SSH connection itself.
        const channel = yield* client.forwardOut({ host: "127.0.0.1", port: forward.port })
        const payload = NodeCrypto.randomBytes(512 * 1024)
        assert.strictEqual(sha256(yield* channelRoundTrip(channel, payload)), sha256(payload))
      }))

    it.live("forwardIn stops listening when its scope closes", () =>
      Effect.gen(function*() {
        const client = yield* connect()
        const port = yield* Effect.scoped(
          Effect.map(client.forwardIn({ bindAddress: "127.0.0.1", port: 0 }), (forward) => forward.port)
        )
        yield* Effect.sleep("100 millis")
        assert.isFalse(yield* Effect.promise(canConnect({ host: "127.0.0.1", port })))
      }))

    it.live("forwardIn forwards remote Unix socket connections", () =>
      Effect.gen(function*() {
        const client = yield* connect()
        const path = tmpPath("remote.sock")
        const forward = yield* client.forwardIn({ socketPath: path })
        yield* Effect.forkChild(
          Stream.runForEach(forward.connections, (connection) => Effect.forkChild(echoChannel(connection.channel)))
        )
        const reply = yield* netRoundTrip({ path }, encoder.encode("from unix"))
        assert.strictEqual(decoder.decode(reply), "from unix")
      }))
  })

  describe("sftp", () => {
    it.live("Sftp.make performs file operations", () =>
      Effect.gen(function*() {
        const client = yield* connect()
        const sftp = yield* Sftp.make(Ssh.fromClient(client))
        assert.strictEqual(sftp.version, 3)
        assert.isTrue(sftp.extensions.has("posix-rename@openssh.com"))
        const dir = tmpPath("sftp")
        yield* sftp.makeDirectory(dir)
        assert.strictEqual(yield* sftp.realPath(`${dir}/../${Path.basename(dir)}`), dir)

        const file = `${dir}/hello.txt`
        yield* sftp.writeFile(file, encoder.encode("hello sftp"))
        assert.strictEqual(Fs.readFileSync(file, "utf8"), "hello sftp")
        assert.strictEqual(decoder.decode(yield* sftp.readFile(file)), "hello sftp")
        assert.strictEqual((yield* sftp.stat(file)).size, BigInt(10))

        yield* Effect.scoped(Effect.gen(function*() {
          const handle = yield* sftp.open(file, { flag: "r+" })
          yield* handle.write(BigInt(6), encoder.encode("SFTP"))
          const chunk = yield* handle.read(BigInt(0), 100)
          assert.strictEqual(decoder.decode(Option.getOrThrow(chunk)), "hello SFTP")
          assert.isTrue(Option.isNone(yield* handle.read(BigInt(100), 10)))
        }))

        yield* sftp.symlink(file, `${dir}/link`)
        assert.strictEqual(yield* sftp.readLink(`${dir}/link`), file)
        assert.strictEqual(((yield* sftp.lstat(`${dir}/link`)).permissions ?? 0) & 0o170000, 0o120000)

        yield* sftp.rename(file, `${dir}/renamed.txt`)
        yield* sftp.setStat(`${dir}/renamed.txt`, { permissions: 0o640 })
        assert.strictEqual(Fs.statSync(`${dir}/renamed.txt`).mode & 0o777, 0o640)
        const names = (yield* sftp.readDirectory(dir)).map((entry) => entry.filename).sort()
        assert.deepStrictEqual(names.filter((name) => name !== "." && name !== ".."), ["link", "renamed.txt"])

        const missing = yield* sshReason(sftp.stat(`${dir}/missing`))
        assert.strictEqual(missing._tag === "SshSftpError" && missing.code, Sftp.StatusCode.NO_SUCH_FILE)

        yield* sftp.remove(`${dir}/link`)
        yield* sftp.remove(`${dir}/renamed.txt`)
        yield* sftp.removeDirectory(dir)
        assert.isFalse(Fs.existsSync(dir))
      }))

    it.live("Sftp transfers large files", () =>
      Effect.gen(function*() {
        const client = yield* connect()
        const sftp = yield* Sftp.make(Ssh.fromClient(client))
        const file = tmpPath("sftp-large")
        const payload = NodeCrypto.randomBytes(24 * MiB)
        yield* sftp.writeFile(file, payload)
        assert.strictEqual(sha256(Fs.readFileSync(file)), sha256(payload))
        assert.strictEqual(sha256(yield* sftp.readFile(file)), sha256(payload))
        const streamed = yield* Stream.runCollect(sftp.stream(file, { chunkSize: 64 * 1024 }))
        assert.strictEqual(sha256(Buffer.concat(streamed)), sha256(payload))
        const ranged = yield* Stream.runCollect(
          sftp.stream(file, { offset: BigInt(1000), bytesToRead: BigInt(100_000) })
        )
        assert.strictEqual(sha256(Buffer.concat(ranged)), sha256(payload.subarray(1000, 101_000)))
        yield* sftp.copyFile(file, `${file}.copy`)
        assert.strictEqual(sha256(Fs.readFileSync(`${file}.copy`)), sha256(payload))
      }))

    it.live("Sftp pages large directories and honours open flags", () =>
      Effect.gen(function*() {
        const client = yield* connect()
        const sftp = yield* Sftp.make(Ssh.fromClient(client))
        const dir = tmpPath("sftp-many")
        Fs.mkdirSync(dir)
        for (let i = 0; i < 400; i++) Fs.writeFileSync(Path.join(dir, `file-${i}`), String(i))
        const entries = (yield* sftp.readDirectory(dir)).filter((e) => e.filename !== "." && e.filename !== "..")
        assert.strictEqual(entries.length, 400)
        const entry = entries.find((e) => e.filename === "file-123")!
        assert.strictEqual(entry.attributes.size, BigInt(3))

        const file = `${dir}/flags`
        yield* sftp.writeFile(file, encoder.encode("one"), { flag: "wx" })
        const exclusive = yield* sshReason(sftp.writeFile(file, encoder.encode("two"), { flag: "wx" }))
        assert.strictEqual(exclusive._tag, "SshSftpError")
        yield* sftp.writeFile(file, encoder.encode("+two"), { flag: "a" })
        assert.strictEqual(Fs.readFileSync(file, "utf8"), "one+two")
        yield* sftp.writeFile(file, encoder.encode("new"), { mode: 0o600 })
        assert.strictEqual(Fs.readFileSync(file, "utf8"), "new")

        // Concurrent requests are multiplexed over one session.
        const contents = yield* Effect.forEach(
          Array.from({ length: 50 }, (_, i) => i),
          (i) => Effect.map(sftp.readFile(`${dir}/file-${i}`), (data) => decoder.decode(data)),
          { concurrency: "unbounded" }
        )
        assert.deepStrictEqual(contents, Array.from({ length: 50 }, (_, i) => String(i)))
      }))

    it.live("Sftp.layerFileSystem implements FileSystem", () =>
      Effect.gen(function*() {
        const fs = yield* FileSystem.FileSystem
        const root = tmpPath("fs")

        yield* fs.makeDirectory(`${root}/a/b/c`, { recursive: true })
        yield* fs.makeDirectory(`${root}/a/b/c`, { recursive: true })
        const exists = yield* failure(fs.makeDirectory(`${root}/a`))
        assert.strictEqual(exists.reason._tag, "AlreadyExists")

        yield* fs.writeFileString(`${root}/a/one.txt`, "one")
        yield* fs.writeFileString(`${root}/a/b/two.ts`, "two")
        yield* fs.writeFileString(`${root}/a/b/c/three.ts`, "three")
        assert.strictEqual(yield* fs.readFileString(`${root}/a/one.txt`), "one")
        assert.isTrue(yield* fs.exists(`${root}/a/b/two.ts`))
        assert.isFalse(yield* fs.exists(`${root}/nope`))
        const notFound = yield* failure(fs.readFile(`${root}/nope`))
        assert.strictEqual(notFound.reason._tag, "NotFound")

        assert.deepStrictEqual((yield* fs.readDirectory(root, { recursive: true })).sort(), [
          "a",
          "a/b",
          "a/b/c",
          "a/b/c/three.ts",
          "a/b/two.ts",
          "a/one.txt"
        ])
        assert.deepStrictEqual((yield* fs.glob("**/*.ts", { root })).sort(), ["a/b/c/three.ts", "a/b/two.ts"])
        assert.deepStrictEqual(yield* fs.glob("a/*.txt", { root }), ["a/one.txt"])

        yield* fs.copy(`${root}/a`, `${root}/copy`)
        assert.strictEqual(Fs.readFileSync(`${root}/copy/b/c/three.ts`, "utf8"), "three")

        yield* fs.rename(`${root}/copy/one.txt`, `${root}/copy/uno.txt`)
        assert.isFalse(Fs.existsSync(`${root}/copy/one.txt`))
        assert.strictEqual(Fs.readFileSync(`${root}/copy/uno.txt`, "utf8"), "one")

        yield* fs.symlink(`${root}/a/one.txt`, `${root}/link`)
        assert.strictEqual(yield* fs.readLink(`${root}/link`), `${root}/a/one.txt`)
        assert.strictEqual(yield* fs.readFileString(`${root}/link`), "one")

        yield* fs.chmod(`${root}/a/one.txt`, 0o600)
        const info = yield* fs.stat(`${root}/a/one.txt`)
        assert.strictEqual(info.type, "File")
        assert.strictEqual(info.mode & 0o777, 0o600)
        assert.strictEqual(info.size, BigInt(3) as typeof info.size)
        assert.strictEqual((yield* fs.stat(`${root}/a`)).type, "Directory")

        // Large files through sink and stream.
        const payload = NodeCrypto.randomBytes(16 * MiB)
        yield* Stream.run(Stream.fromIterable(chunked(payload, 100_000)), fs.sink(`${root}/big.bin`))
        assert.strictEqual(sha256(Fs.readFileSync(`${root}/big.bin`)), sha256(payload))
        const streamed = yield* Stream.runCollect(fs.stream(`${root}/big.bin`))
        assert.strictEqual(sha256(Buffer.concat(streamed)), sha256(payload))
        yield* fs.writeFile(`${root}/big2.bin`, payload)
        assert.strictEqual(sha256(yield* fs.readFile(`${root}/big2.bin`)), sha256(payload))

        const temp = yield* Effect.scoped(Effect.gen(function*() {
          const temp = yield* fs.makeTempDirectoryScoped({ directory: root, prefix: "tmp-" })
          yield* fs.writeFileString(`${temp}/inside`, "x")
          assert.isTrue(Fs.existsSync(`${temp}/inside`))
          return temp
        }))
        assert.isFalse(Fs.existsSync(temp))
        const tempFile = yield* fs.makeTempFile({ directory: root, suffix: ".txt" })
        assert.isTrue(tempFile.endsWith(".txt"))
        assert.isTrue(Fs.existsSync(tempFile))

        // File handles, truncate, utimes, links and access.
        yield* Effect.scoped(Effect.gen(function*() {
          const handle = yield* fs.open(`${root}/handle.txt`, { flag: "w+" })
          yield* handle.writeAll(encoder.encode("0123456789"))
          yield* handle.seek(BigInt(2), "start")
          const buffer = new Uint8Array(4)
          assert.strictEqual(yield* handle.read(buffer), 4)
          assert.strictEqual(decoder.decode(buffer), "2345")
          yield* handle.truncate(5)
          assert.strictEqual((yield* handle.stat).size, BigInt(5) as typeof info.size)
        }))
        assert.strictEqual(Fs.readFileSync(`${root}/handle.txt`, "utf8"), "01234")
        yield* fs.truncate(`${root}/handle.txt`, 2)
        assert.strictEqual(Fs.readFileSync(`${root}/handle.txt`, "utf8"), "01")
        const mtime = new Date("2020-01-02T03:04:05Z")
        yield* fs.utimes(`${root}/handle.txt`, mtime, mtime)
        assert.strictEqual(Fs.statSync(`${root}/handle.txt`).mtime.getTime(), mtime.getTime())
        yield* fs.link(`${root}/handle.txt`, `${root}/hard.txt`)
        assert.strictEqual(Fs.statSync(`${root}/hard.txt`).ino, Fs.statSync(`${root}/handle.txt`).ino)
        yield* fs.access(`${root}/handle.txt`, { readable: true, writable: true })
        assert.strictEqual(yield* fs.realPath(`${root}/a/../a/one.txt`), `${root}/a/one.txt`)
        const overwrite = yield* failure(fs.copy(`${root}/a`, `${root}/copy`))
        assert.strictEqual(overwrite.reason._tag, "AlreadyExists")
        yield* fs.writeFileString(`${root}/target.txt`, "old")
        yield* fs.rename(`${root}/handle.txt`, `${root}/target.txt`)
        assert.strictEqual(Fs.readFileSync(`${root}/target.txt`, "utf8"), "01")

        const directory = yield* failure(fs.remove(`${root}/a`))
        assert.strictEqual(directory.reason._tag, "BadResource")
        yield* fs.remove(root, { recursive: true })
        assert.isFalse(Fs.existsSync(root))
        yield* fs.remove(root, { force: true })
      }).pipe(Effect.provide(Sftp.layerFileSystem.pipe(Layer.provide(SshLayer)))))
  })

  describe("SshChildProcessSpawner", () => {
    const SpawnerLayer = SshChildProcessSpawner.layer.pipe(Layer.provide(SshLayer))

    it.live("runs commands and collects output", () =>
      Effect.gen(function*() {
        const spawner = yield* ChildProcessSpawner
        assert.strictEqual(yield* spawner.string(ChildProcess.make("echo", ["hello", "world"])), "hello world\n")
        assert.deepStrictEqual(yield* spawner.lines(ChildProcess.make("printf", ["a\nb\nc\n"])), ["a", "b", "c"])
        assert.strictEqual(yield* spawner.exitCode(ChildProcess.make("sh", ["-c", "exit 42"])), 42)
        assert.strictEqual(yield* spawner.exitCode(ChildProcess.make("true")), 0)
        const both = yield* spawner.string(ChildProcess.make("sh", ["-c", "echo out; echo err >&2"]), {
          includeStderr: true
        })
        assert.deepStrictEqual(both.split("\n").filter(Boolean).sort(), ["err", "out"])
      }).pipe(Effect.provide(SpawnerLayer)))

    it.live("quotes arguments", () =>
      Effect.gen(function*() {
        const spawner = yield* ChildProcessSpawner
        const args = ["with space", "it's", "\"double\"", "$HOME", "`date`", "a;b", "*", "", "tab\there"]
        const output = yield* spawner.string(ChildProcess.make("printf", ["%s|", ...args]))
        assert.strictEqual(output, args.join("|") + "|")
      }).pipe(Effect.provide(SpawnerLayer)))

    it.live("applies cwd and env", () =>
      Effect.gen(function*() {
        const spawner = yield* ChildProcessSpawner
        const dir = tmpPath("cwd dir")
        Fs.mkdirSync(dir)
        assert.strictEqual(yield* spawner.string(ChildProcess.make("pwd", [], { cwd: dir })), `${dir}\n`)
        // Without extendEnv the remote environment is replaced.
        const isolated = yield* spawner.string(
          ChildProcess.make("/bin/sh", ["-c", "echo \"$FOO|${HOME:-none}\""], { env: { FOO: "bar baz" } })
        )
        assert.strictEqual(isolated, "bar baz|none\n")
        const extended = yield* spawner.string(
          ChildProcess.make("sh", ["-c", "echo \"$FOO|$HOME\""], { env: { FOO: "x" }, extendEnv: true })
        )
        assert.strictEqual(extended, `x|${Os.homedir()}\n`)
        const missing = yield* spawner.exitCode(ChildProcess.make("true", [], { cwd: `${dir}/missing` }))
        assert.notStrictEqual(missing, 0)
      }).pipe(Effect.provide(SpawnerLayer)))

    it.live("runs commands through the remote shell with shell: true", () =>
      Effect.gen(function*() {
        const spawner = yield* ChildProcessSpawner
        const output = yield* spawner.string(
          ChildProcess.make("echo", ["one", "&&", "echo", "two"], { shell: true })
        )
        assert.strictEqual(output, "one\ntwo\n")
        const sh = yield* spawner.string(
          ChildProcess.make("echo $((6 * 7))", [], { shell: "/bin/sh" })
        )
        assert.strictEqual(sh, "42\n")
      }).pipe(Effect.provide(SpawnerLayer)))

    it.live("pipes commands", () =>
      Effect.gen(function*() {
        const spawner = yield* ChildProcessSpawner
        const sorted = yield* spawner.lines(
          ChildProcess.make("printf", ["b\nc\na\n"]).pipe(
            ChildProcess.pipeTo(ChildProcess.make("sort")),
            ChildProcess.pipeTo(ChildProcess.make("tr", ["a-z", "A-Z"]))
          )
        )
        assert.deepStrictEqual(sorted, ["A", "B", "C"])
        const fromStderr = yield* spawner.string(
          ChildProcess.make("sh", ["-c", "echo to-stderr >&2"]).pipe(
            ChildProcess.pipeTo(ChildProcess.make("tr", ["a-z", "A-Z"]), { from: "stderr" })
          )
        )
        assert.strictEqual(fromStderr, "TO-STDERR\n")
      }).pipe(Effect.provide(SpawnerLayer)))

    it.live("streams stdin", () =>
      Effect.gen(function*() {
        const spawner = yield* ChildProcessSpawner
        const output = yield* spawner.string(ChildProcess.make("cat", [], {
          stdin: Stream.fromIterable(["hello ", "from ", "a stream"].map((s) => encoder.encode(s)))
        }))
        assert.strictEqual(output, "hello from a stream")
        const handle = yield* spawner.spawn(ChildProcess.make("wc", ["-c"]))
        const out = yield* Effect.forkChild(Stream.mkString(Stream.decodeText(handle.stdout)))
        yield* Stream.run(Stream.make(new Uint8Array(1000), new Uint8Array(234)), handle.stdin)
        assert.strictEqual((yield* Fiber.join(out)).trim(), "1234")
        assert.strictEqual(yield* handle.exitCode, 0)
      }).pipe(Effect.provide(SpawnerLayer)))

    it.live("kills running commands", () =>
      Effect.gen(function*() {
        const spawner = yield* ChildProcessSpawner
        const handle = yield* spawner.spawn(ChildProcess.make("sleep", ["30"]))
        assert.isTrue(yield* handle.isRunning)
        yield* handle.kill()
        const exit = yield* failure(handle.exitCode)
        assert.include(exit.message, "SIGTERM")
        assert.isFalse(yield* handle.isRunning)
        // An explicit SIGKILL terminates commands that ignore SIGTERM.
        const stubborn = yield* spawner.spawn(ChildProcess.make("sh", ["-c", "trap '' TERM; echo ready; sleep 30"]))
        yield* Effect.flatMap(Stream.toPull(stubborn.stdout), (pull) => pull)
        yield* stubborn.kill({ killSignal: "SIGKILL" })
        const killed = yield* failure(Effect.timeout(stubborn.exitCode, "5 seconds"))
        assert.include(killed.message, "SIGKILL")
      }).pipe(Effect.provide(SpawnerLayer)))

    it.live("forceKillAfter terminates commands that ignore the kill signal", () =>
      Effect.gen(function*() {
        const spawner = yield* ChildProcessSpawner
        const handle = yield* spawner.spawn(ChildProcess.make("sh", ["-c", "trap '' TERM; echo ready; sleep 4"]))
        yield* Effect.flatMap(Stream.toPull(handle.stdout), (pull) => pull)
        yield* Effect.timeout(handle.kill({ forceKillAfter: "200 millis" }), "2 seconds")
        const killed = yield* failure(Effect.timeout(handle.exitCode, "1 second"))
        assert.include(killed.message, "SIGKILL")
      }).pipe(Effect.provide(SpawnerLayer)))
  })

  describe.skipIf(!hasAgent)("ssh-agent", () => {
    let agent: NodeChildProcess.ChildProcess | undefined
    let agentSocket = ""
    let agentKey: SshKey.PublicKey | undefined

    beforeAll(async () => {
      const { dir } = getFixture()
      agentSocket = Path.join(dir, "agent.sock")
      const logs: Array<string> = []
      agent = spawnDaemon(bin.sshAgent!, ["-D", "-a", agentSocket], logs)
      await waitFor("ssh-agent", canConnect({ path: agentSocket }), agent)
      // Only the agent holds this key, and it is authorized by sshd.
      const keyPath = Path.join(dir, "agent_key")
      await run(bin.sshKeygen!, ["-q", "-t", "ecdsa", "-b", "384", "-N", "", "-C", "agent-key", "-f", keyPath])
      Fs.appendFileSync(Path.join(dir, "authorized_keys"), Fs.readFileSync(`${keyPath}.pub`))
      await run(bin.sshAdd!, [keyPath], { SSH_AUTH_SOCK: agentSocket })
      agentKey = parsePublicKey(Fs.readFileSync(`${keyPath}.pub`, "utf8"))
    }, 30_000)

    afterAll(async () => {
      await stopProcess(agent)
    }, 10_000)

    const realAgent = Effect.suspend(() =>
      Effect.map(NodeSocket.makeNet({ path: agentSocket }), (socket) => SshAgent.make(socket))
    )

    it.live("lists identities and signs through the real agent", () =>
      Effect.gen(function*() {
        const agent = yield* realAgent
        const identities = yield* agent.identities
        assert.strictEqual(identities.length, 1)
        assert.isTrue(SshKey.equals(identities[0].publicKey, agentKey!))
        assert.strictEqual(identities[0].publicKey.comment, "agent-key")
        const data = encoder.encode("sign me")
        const signature = yield* identities[0].sign(data, "ecdsa-sha2-nistp384")
        assert.isTrue(yield* SshKey.verify(agentKey!, data, signature))
      }))

    it.live("authenticates with the agent", () =>
      Effect.gen(function*() {
        const agent = yield* realAgent
        const client = yield* connect({ auth: SshClient.agent(agent) })
        assert.strictEqual((yield* client.run("echo via-agent")).stdout, "via-agent\n")
      }))

    it.live("forwards the agent to remote sessions", () =>
      Effect.gen(function*() {
        const agent = yield* realAgent
        const client = yield* connect({ agentForwarding: agent })
        const agentBlob = SshKey.formatPublicKey(agentKey!).split(" ")[1]
        // Before any session requests forwarding, the agent is not reachable.
        // (sshd keeps the forwarded socket for the rest of the connection.)
        const plain = yield* client.run(sh(`echo "sock:\${SSH_AUTH_SOCK:-}"; ${bin.sshAdd} -L || true`))
        assert.notInclude(plain.stdout, agentBlob)
        const listed = yield* client.run(sh(`echo "sock:$SSH_AUTH_SOCK"; ${bin.sshAdd} -L`), { forwardAgent: true })
        assert.deepStrictEqual(listed.exit, { _tag: "ExitStatus", code: 0 }, listed.stderr)
        assert.match(listed.stdout, /^sock:\/\S+/)
        assert.notStrictEqual(listed.stdout.split("\n")[0], plain.stdout.split("\n")[0])
        assert.include(listed.stdout, agentBlob)
      }))

    it.live.skipIf(bin.ssh === undefined)(
      "signs remote authentication through the forwarded agent",
      () =>
        Effect.gen(function*() {
          const { port, username } = getFixture()
          const client = yield* connect({ agentForwarding: yield* realAgent })
          const nested = [
            bin.ssh!,
            "-F /dev/null -o BatchMode=yes -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null",
            "-o IdentitiesOnly=no -o LogLevel=ERROR",
            `-p ${port} ${username}@127.0.0.1 echo nested-ok`
          ].join(" ")
          const result = yield* client.run(sh(nested), { forwardAgent: true })
          assert.deepStrictEqual(result.exit, { _tag: "ExitStatus", code: 0 }, result.stderr)
          assert.strictEqual(result.stdout, "nested-ok\n")
        })
    )

    it.live("forwards an in-memory agent", () =>
      Effect.gen(function*() {
        const key = yield* SshKey.generate("ssh-ed25519", { comment: "in-memory" })
        const client = yield* connect({ agentForwarding: SshAgent.fromKeys([key]) })
        const listed = yield* client.run(sh(`${bin.sshAdd} -L`), { forwardAgent: true })
        assert.deepStrictEqual(listed.exit, { _tag: "ExitStatus", code: 0 }, listed.stderr)
        assert.include(listed.stdout, SshKey.formatPublicKey(key.publicKey).split(" ")[1])
      }))
  })

  describe.skipIf(bin.ssh === undefined)("OpenSsh backend", () => {
    const openSshOptions = (overrides: Partial<OpenSsh.Options> = {}): OpenSsh.Options => {
      const { dir, knownHosts, port } = getFixture()
      const knownHostsFile = Path.join(dir, "openssh_known_hosts")
      if (!Fs.existsSync(knownHostsFile)) Fs.writeFileSync(knownHostsFile, knownHosts)
      return {
        host: "127.0.0.1",
        port,
        identityFile: Path.join(dir, "user_ed25519"),
        executable: bin.ssh!,
        // Ignore the developer's own configuration for deterministic tests.
        args: ["-F", "/dev/null"],
        options: {
          StrictHostKeyChecking: "yes",
          UserKnownHostsFile: knownHostsFile,
          IdentitiesOnly: true
        },
        ...overrides
      }
    }
    const OpenSshLayer = (overrides: Partial<OpenSsh.Options> = {}) =>
      Layer.unwrap(Effect.sync(() => OpenSsh.layer(openSshOptions(overrides)))).pipe(
        Layer.provide(NodeServices.layer)
      )

    for (const multiplex of [true, false]) {
      describe(multiplex ? "multiplexed" : "without multiplexing", () => {
        const layer = OpenSshLayer({ multiplex })

        it.live("runs commands", () =>
          Effect.gen(function*() {
            const ssh = yield* Ssh.Ssh
            assert.strictEqual(ssh.backend, "openssh")
            assert.isFalse(ssh.capabilities.signals)
            assert.deepStrictEqual(yield* ssh.run(sh("echo out; echo err >&2; exit 3")), {
              stdout: "out\n",
              stderr: "err\n",
              exit: { _tag: "ExitStatus", code: 3 }
            })
            assert.strictEqual((yield* ssh.run("cat", { stdin: "piped input" })).stdout, "piped input")
          }).pipe(Effect.provide(layer)))

        it.live("passes environment variables and allocates terminals", () =>
          Effect.gen(function*() {
            const ssh = yield* Ssh.Ssh
            const env = yield* ssh.run(sh("echo \"[$EFFECT_A] [$EFFECT_B]\""), {
              env: { EFFECT_A: "plain", EFFECT_B: `with "quotes" and \\ backslash` }
            })
            assert.strictEqual(env.stdout, `[plain] [with "quotes" and \\ backslash]\n`)
            const pty = yield* ssh.run(sh("tty; echo $TERM"), { pty: { term: "vt100" } })
            assert.match(pty.stdout, /^\/dev\/(pts\/\d+|tty\w+)\r?\nvt100/)
          }).pipe(Effect.provide(layer)))

        it.live("runs many sessions concurrently", () =>
          Effect.gen(function*() {
            const ssh = yield* Ssh.Ssh
            const results = yield* Effect.forEach(
              Array.from({ length: 12 }, (_, i) => i),
              (i) => Effect.map(ssh.run(`echo ${i}`), (result) => result.stdout.trim()),
              { concurrency: "unbounded" }
            )
            assert.deepStrictEqual(results, Array.from({ length: 12 }, (_, i) => String(i)))
          }).pipe(Effect.provide(layer)))

        it.live("serves SFTP and the FileSystem adapter", () =>
          Effect.gen(function*() {
            const fs = yield* FileSystem.FileSystem
            const dir = tmpPath("openssh-sftp")
            yield* fs.makeDirectory(`${dir}/a/b`, { recursive: true })
            const data = NodeCrypto.randomBytes(3 * 1024 * 1024)
            yield* fs.writeFile(`${dir}/a/b/data.bin`, data)
            assert.strictEqual(sha256(yield* fs.readFile(`${dir}/a/b/data.bin`)), sha256(data))
            yield* fs.writeFileString(`${dir}/a/note.txt`, "note")
            assert.deepStrictEqual((yield* fs.glob("**/*.{bin,txt}", { root: dir })).sort(), [
              "a/b/data.bin",
              "a/note.txt"
            ])
            yield* fs.rename(`${dir}/a/note.txt`, `${dir}/a/renamed.txt`)
            assert.strictEqual(yield* fs.readFileString(`${dir}/a/renamed.txt`), "note")
            yield* fs.remove(dir, { recursive: true })
            assert.isFalse(yield* fs.exists(dir))
          }).pipe(Effect.provide(Sftp.layerFileSystem.pipe(Layer.provide(layer)))))

        it.live("runs ChildProcess commands remotely", () =>
          Effect.gen(function*() {
            const spawner = yield* ChildProcessSpawner
            assert.strictEqual(
              yield* spawner.string(ChildProcess.make("printf", ["%s|", "a b", "it's", "$HOME", "`x`"])),
              "a b|it's|$HOME|`x`|"
            )
            const dir = tmpPath("openssh-cwd")
            Fs.mkdirSync(dir)
            assert.strictEqual((yield* spawner.string(ChildProcess.make("pwd", [], { cwd: dir }))).trim(), dir)
            assert.strictEqual(
              (yield* spawner.string(
                ChildProcess.make("sh", ["-c", "echo $EFFECT_X"], { env: { EFFECT_X: "set" }, extendEnv: true })
              )).trim(),
              "set"
            )
            // The process id report is removed from standard error.
            assert.strictEqual(
              yield* spawner.string(ChildProcess.make("sh", ["-c", "echo err >&2"]), { includeStderr: true }),
              "err\n"
            )
            assert.strictEqual(
              yield* spawner.string(
                ChildProcess.make("printf", ["b\\na\\n"]).pipe(ChildProcess.pipeTo(ChildProcess.make("sort")))
              ),
              "a\nb\n"
            )
            assert.strictEqual(yield* spawner.exitCode(ChildProcess.make("sh", ["-c", "exit 9"])), 9)
          }).pipe(Effect.provide(SshChildProcessSpawner.layer.pipe(Layer.provide(layer)))))

        it.live("kills remote commands by process id", () =>
          Effect.gen(function*() {
            const handle = yield* ChildProcess.make("sleep", ["30"])
            assert.isAbove(handle.pid, 1)
            yield* handle.kill()
            const terminated = yield* Effect.flip(handle.exitCode)
            assert.include(terminated.message, "SIGTERM")

            const stubborn = yield* ChildProcess.make("sh", ["-c", "trap '' TERM; echo ready; sleep 30"])
            yield* Effect.flatMap(Stream.toPull(stubborn.stdout), (pull) => pull)
            const started = Date.now()
            yield* stubborn.kill({ forceKillAfter: "200 millis" })
            assert.isBelow(Date.now() - started, 5_000)
            const killed = yield* Effect.flip(stubborn.exitCode)
            assert.include(killed.message, "SIGKILL")
          }).pipe(Effect.scoped, Effect.provide(SshChildProcessSpawner.layer.pipe(Layer.provide(layer)))))

        it.live("forwards TCP connections and Unix sockets", () =>
          Effect.gen(function*() {
            const ssh = yield* Ssh.Ssh
            const server = Net.createServer((connection) => connection.pipe(connection))
            yield* Effect.acquireRelease(
              Effect.promise(() => new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve))),
              () => Effect.sync(() => server.close())
            )
            const port = (server.address() as Net.AddressInfo).port
            const tunnel = yield* ssh.forwardOut({ host: "127.0.0.1", port })
            yield* tunnel.write("over tcp")
            const head = yield* Stream.runHead(tunnel.stdout)
            assert.strictEqual(decoder.decode(Option.getOrThrow(head)), "over tcp")

            const socketPath = tmpPath("openssh.sock")
            const unixServer = Net.createServer((connection) => connection.pipe(connection))
            yield* Effect.acquireRelease(
              Effect.promise(() => new Promise<void>((resolve) => unixServer.listen(socketPath, resolve))),
              () => Effect.sync(() => unixServer.close())
            )
            const socket = ssh.forwardOutSocket({ socketPath })
            const pull = yield* Socket.readerBytes(socket)
            const writer = yield* socket.writer
            yield* writer.write(encoder.encode("over unix"))
            assert.strictEqual(decoder.decode((yield* pull)[0]), "over unix")
          }).pipe(Effect.scoped, Effect.provide(layer)))
      })
    }

    it.live("reports authentication failures with ssh diagnostics", () =>
      Effect.gen(function*() {
        const keyFile = tmpPath("unauthorized")
        yield* Effect.promise(() => run(bin.sshKeygen!, ["-q", "-N", "", "-t", "ed25519", "-f", keyFile]))
        const error = yield* Effect.flip(
          Layer.build(OpenSshLayer({ identityFile: keyFile, connectTimeout: "10 seconds" }))
        )
        assert.strictEqual(error._tag, "SshError")
        if (error._tag === "SshError") {
          assert.strictEqual(error.reason._tag, "SshConnectionError")
          assert.include(String((error.reason as SshError.SshConnectionError).cause), "Permission denied")
        }
      }).pipe(Effect.scoped))

    it.live("rejects unknown host keys", () =>
      Effect.gen(function*() {
        const knownHostsFile = tmpPath("empty_known_hosts")
        Fs.writeFileSync(knownHostsFile, "")
        const options = openSshOptions()
        const error = yield* Effect.flip(Layer.build(
          OpenSsh.layer({ ...options, options: { ...options.options, UserKnownHostsFile: knownHostsFile } }).pipe(
            Layer.provide(NodeServices.layer)
          )
        ))
        assert.strictEqual(error._tag, "SshError")
        if (error._tag === "SshError") assert.strictEqual(error.reason._tag, "SshConnectionError")
      }).pipe(Effect.scoped))
  })
})
