/**
 * End-to-end tests of the `OpenSsh` backend and `SshChildProcessSpawner` against an OpenSSH server running in a container
 * (see `fixtures/sshd`), driven by the host's `ssh` executable.
 */
import * as NodeChildProcessSpawner from "@effect/platform-node-shared/NodeChildProcessSpawner"
import * as NodeFileSystem from "@effect/platform-node-shared/NodeFileSystem"
import * as NodePath from "@effect/platform-node-shared/NodePath"
import { afterAll, assert, beforeAll, describe, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as ChildProcess from "effect/process/ChildProcess"
import { ChildProcessSpawner } from "effect/process/ChildProcessSpawner"
import * as Schedule from "effect/Schedule"
import * as Socket from "effect/socket/Socket"
import * as OpenSsh from "effect/ssh/OpenSsh"
import * as Ssh from "effect/ssh/Ssh"
import * as SshChildProcessSpawner from "effect/ssh/SshChildProcessSpawner"
import * as Stream from "effect/Stream"
import * as NodeChildProcess from "node:child_process"
import * as NodeCrypto from "node:crypto"
import * as Fs from "node:fs"
import * as Os from "node:os"
import * as Path from "node:path"
import { fileURLToPath } from "node:url"
import { GenericContainer, type StartedTestContainer, Wait } from "testcontainers"

const which = (name: string): string | undefined => {
  for (const dir of (process.env.PATH ?? "").split(Path.delimiter)) {
    if (dir === "") continue
    const candidate = Path.join(dir, name)
    try {
      Fs.accessSync(candidate, Fs.constants.X_OK)
      return candidate
    } catch {
      // keep looking
    }
  }
  return undefined
}

const bin = { ssh: which("ssh"), sshKeygen: which("ssh-keygen") }

const run = (file: string, args: ReadonlyArray<string>): Promise<string> =>
  new Promise((resolve, reject) => {
    NodeChildProcess.execFile(file, args, (error, stdout, stderr) => {
      if (error) reject(new Error(`${file} ${args.join(" ")} failed: ${stderr}`, { cause: error }))
      else resolve(stdout)
    })
  })

// -----------------------------------------------------------------------------
// Fixture
// -----------------------------------------------------------------------------

interface Fixture {
  readonly dir: string
  readonly container: StartedTestContainer
  readonly host: string
  readonly port: number
  readonly identityFile: string
  readonly knownHostsFile: string
}

const startSshd = async (): Promise<Fixture> => {
  const dir = Fs.realpathSync(Fs.mkdtempSync(Path.join(Os.tmpdir(), "effect-openssh-")))
  try {
    const identityFile = Path.join(dir, "user_ed25519")
    await run(bin.sshKeygen!, ["-q", "-N", "", "-t", "ed25519", "-f", identityFile])
    const image = await GenericContainer.fromDockerfile(fileURLToPath(new URL("./fixtures/sshd", import.meta.url)))
      .build("effect-test-sshd", { deleteOnExit: false })
    const container = await image
      .withCopyContentToContainer([{
        content: Fs.readFileSync(`${identityFile}.pub`),
        target: "/etc/ssh/authorized_keys",
        mode: 0o644
      }])
      .withExposedPorts(22)
      .withWaitStrategy(Wait.forSuccessfulCommand("nc -z 127.0.0.1 22"))
      .start()
    const host = container.getHost()
    const port = container.getMappedPort(22)
    const hostKey = (await container.exec(["cat", "/etc/ssh/ssh_host_ed25519_key.pub"])).output
      .trim()
      .split(" ")
      .slice(0, 2)
      .join(" ")
    const knownHostsFile = Path.join(dir, "known_hosts")
    Fs.writeFileSync(knownHostsFile, `[${host}]:${port} ${hostKey}\n`)
    return { dir, container, host, port, identityFile, knownHostsFile }
  } catch (error) {
    Fs.rmSync(dir, { recursive: true, force: true })
    throw error
  }
}

let fixture: Fixture | undefined
const getFixture = (): Fixture => {
  if (fixture === undefined) throw new Error("sshd fixture is not running")
  return fixture
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

const decoder = new TextDecoder()
const encoder = new TextEncoder()

const sh = (script: string) => `exec sh -c ${SshChildProcessSpawner.quote(script)}`

/** A fresh path under `/tmp` inside the container. */
const remotePath = (name: string) => `/tmp/${name}-${NodeCrypto.randomBytes(4).toString("hex")}`

const NodeLayer = NodeChildProcessSpawner.layer.pipe(
  Layer.provideMerge(Layer.mergeAll(NodeFileSystem.layer, NodePath.layer))
)

const openSshOptions = (overrides: Partial<OpenSsh.Options> = {}): OpenSsh.Options => {
  const { identityFile, knownHostsFile, port } = getFixture()
  return {
    port,
    user: "effect",
    identityFile,
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
  Layer.unwrap(Effect.sync(() => OpenSsh.layer(openSshOptions(overrides)))).pipe(Layer.provide(NodeLayer))

/** Opens a connection to the fixture sshd through the `Ssh` factory. */
const connection = Effect.flatMap(Ssh.Ssh, (ssh) => ssh.connect({ host: getFixture().host }))

const remoteSpawner = Layer.effect(ChildProcessSpawner, Effect.map(connection, SshChildProcessSpawner.make))

// -----------------------------------------------------------------------------
// Tests
// -----------------------------------------------------------------------------

describe.skipIf(bin.ssh === undefined || bin.sshKeygen === undefined)("OpenSsh (container)", {
  timeout: 60_000
}, () => {
  beforeAll(async () => {
    fixture = await startSshd()
  }, 300_000)

  afterAll(async () => {
    const current = fixture
    fixture = undefined
    if (current === undefined) return
    await current.container.stop()
    Fs.rmSync(current.dir, { recursive: true, force: true })
  }, 60_000)

  for (const multiplex of [true, false]) {
    describe(multiplex ? "multiplexed" : "without multiplexing", () => {
      const layer = OpenSshLayer({ multiplex })

      it.live("runs commands", () =>
        Effect.gen(function*() {
          const ssh = yield* connection
          assert.strictEqual(ssh.backend, "openssh")
          assert.deepStrictEqual(yield* ssh.run(sh("echo out; echo err >&2; exit 3")), {
            stdout: "out\n",
            stderr: "err\n",
            exit: { _tag: "ExitStatus", code: 3 }
          })
          assert.strictEqual((yield* ssh.run("cat", { stdin: "piped input" })).stdout, "piped input")
        }).pipe(Effect.scoped, Effect.provide(layer)))

      it.live("passes environment variables and allocates terminals", () =>
        Effect.gen(function*() {
          const ssh = yield* connection
          const env = yield* ssh.run(sh("echo \"[$EFFECT_A] [$EFFECT_B]\""), {
            env: { EFFECT_A: "plain", EFFECT_B: `with "quotes" and \\ backslash` }
          })
          assert.strictEqual(env.stdout, `[plain] [with "quotes" and \\ backslash]\n`)
          const pty = yield* ssh.run(sh("tty; echo $TERM"), { pty: { term: "vt100" } })
          assert.match(pty.stdout, /^\/dev\/(pts\/\d+|tty\w+)\r?\nvt100/)
        }).pipe(Effect.scoped, Effect.provide(layer)))

      it.live("runs many sessions concurrently", () =>
        Effect.gen(function*() {
          const ssh = yield* connection
          const results = yield* Effect.forEach(
            Array.from({ length: 12 }, (_, i) => i),
            (i) => Effect.map(ssh.run(`echo ${i}`), (result) => result.stdout.trim()),
            { concurrency: "unbounded" }
          )
          assert.deepStrictEqual(results, Array.from({ length: 12 }, (_, i) => String(i)))
        }).pipe(Effect.scoped, Effect.provide(layer)))

      it.live("starts subsystems", () =>
        Effect.gen(function*() {
          const ssh = yield* connection
          const echo = yield* ssh.subsystem("echo")
          yield* echo.write("through a subsystem")
          yield* echo.eof
          const output = yield* Stream.mkString(Stream.decodeText(echo.stdout))
          assert.strictEqual(output, "through a subsystem")
        }).pipe(Effect.scoped, Effect.provide(layer)))

      it.live("runs ChildProcess commands remotely", () =>
        Effect.gen(function*() {
          const spawner = yield* ChildProcessSpawner
          assert.strictEqual(
            yield* spawner.string(ChildProcess.make("printf", ["%s|", "a b", "it's", "$HOME", "`x`"])),
            "a b|it's|$HOME|`x`|"
          )
          const dir = remotePath("cwd")
          assert.strictEqual(yield* spawner.exitCode(ChildProcess.make("mkdir", [dir])), 0)
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
        }).pipe(Effect.provide(remoteSpawner.pipe(Layer.provide(layer)))))

      it.live("kills remote commands by closing the session", () =>
        Effect.gen(function*() {
          const handle = yield* ChildProcess.make("sh", ["-c", "trap '' TERM; echo ready; sleep 30"])
          yield* Effect.flatMap(Stream.toPull(handle.stdout), (pull) => pull)
          const started = Date.now()
          yield* handle.kill()
          // OpenSSH cannot deliver signals, so there is no grace period.
          assert.isBelow(Date.now() - started, 1_000)
          assert.include((yield* Effect.flip(handle.exitCode)).message, "closing its SSH session")
        }).pipe(Effect.scoped, Effect.provide(remoteSpawner.pipe(Layer.provide(layer)))))

      it.live("interrupts and hangs up commands with a pty", () =>
        Effect.gen(function*() {
          const ssh = yield* connection
          // Unique durations identify the remote processes.
          const [interruptedFor, hungUpFor] = [600, 700].map((base) => base + NodeCrypto.randomInt(100))
          const start = (seconds: number) =>
            Effect.tap(
              ssh.exec(sh(`echo ready; exec sleep ${seconds}`), { pty: true }),
              (process) => Effect.flatMap(Stream.toPull(process.stdout), (pull) => pull)
            )
          const gone = (seconds: number) =>
            ssh.run(sh(`ps -o args | grep -c '^sleep ${seconds}$' || true`)).pipe(
              Effect.map((result) => result.stdout.trim() === "0"),
              Effect.repeat({ until: (done) => done, times: 40, schedule: Schedule.spaced("50 millis") })
            )

          // Writing ^C interrupts the command like Ctrl-C.
          const interrupted = yield* start(interruptedFor)
          yield* interrupted.write("\x03")
          yield* interrupted.exit
          assert.isTrue(yield* gone(interruptedFor))

          // Closing the session hangs up the command.
          yield* Effect.scoped(start(hungUpFor))
          assert.isTrue(yield* gone(hungUpFor))
        }).pipe(Effect.scoped, Effect.provide(layer)))

      it.live("forwards TCP connections and Unix sockets", () =>
        Effect.gen(function*() {
          const ssh = yield* connection
          // Echo servers inside the container (see fixtures/sshd).
          const tunnel = yield* ssh.forwardOut("127.0.0.1:7000")
          yield* tunnel.write("over tcp")
          const head = yield* Stream.runHead(tunnel.stdout)
          assert.strictEqual(decoder.decode(Option.getOrThrow(head)), "over tcp")

          const socket = ssh.forwardOutSocket({ path: "/tmp/echo.sock" })
          const pull = yield* Socket.readerBytes(socket)
          const writer = yield* socket.writer
          yield* writer.write(encoder.encode("over unix"))
          assert.strictEqual(decoder.decode((yield* pull)[0]), "over unix")
        }).pipe(Effect.scoped, Effect.provide(layer)))
    })
  }

  it.live("reports authentication failures with ssh diagnostics", () =>
    Effect.gen(function*() {
      const keyFile = Path.join(getFixture().dir, `unauthorized-${NodeCrypto.randomBytes(4).toString("hex")}`)
      yield* Effect.promise(() => run(bin.sshKeygen!, ["-q", "-N", "", "-t", "ed25519", "-f", keyFile]))
      const error = yield* Effect.flip(
        connection.pipe(Effect.provide(OpenSshLayer({ identityFile: keyFile, connectTimeout: "10 seconds" })))
      )
      assert.strictEqual(error.reason, "Connection")
      assert.include(error.description, "Permission denied")
    }).pipe(Effect.scoped))

  it.live("rejects unknown host keys", () =>
    Effect.gen(function*() {
      const knownHostsFile = Path.join(getFixture().dir, "empty_known_hosts")
      Fs.writeFileSync(knownHostsFile, "")
      const options = openSshOptions()
      const error = yield* Effect.flip(connection.pipe(Effect.provide(
        OpenSsh.layer({ ...options, options: { ...options.options, UserKnownHostsFile: knownHostsFile } }).pipe(
          Layer.provide(NodeLayer)
        )
      )))
      assert.strictEqual(error.reason, "Connection")
    }).pipe(Effect.scoped))
})
