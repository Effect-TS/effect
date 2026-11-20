/**
 * End-to-end tests of `NodeOpenSsh` against an OpenSSH server running in a
 * container (see `fixtures/sshd`), driven by the host's `ssh` and
 * `ssh-keygen` executables.
 */
import * as NodeChildProcessSpawner from "@effect/platform-node-shared/NodeChildProcessSpawner"
import * as NodeFileSystem from "@effect/platform-node-shared/NodeFileSystem"
import * as NodeOpenSsh from "@effect/platform-node-shared/NodeOpenSsh"
import * as NodePath from "@effect/platform-node-shared/NodePath"
import * as NodeSocket from "@effect/platform-node-shared/NodeSocket"
import * as NodeSocketServer from "@effect/platform-node-shared/NodeSocketServer"
import { assert, it } from "@effect/vitest"
import * as Context from "effect/Context"
import * as Data from "effect/Data"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Fiber from "effect/Fiber"
import * as FileSystem from "effect/FileSystem"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as Path from "effect/Path"
import * as ChildProcess from "effect/process/ChildProcess"
import { ChildProcessSpawner } from "effect/process/ChildProcessSpawner"
import * as Random from "effect/Random"
import * as Schedule from "effect/Schedule"
import * as Socket from "effect/socket/Socket"
import * as Ssh from "effect/ssh/Ssh"
import * as SshCommand from "effect/ssh/SshCommand"
import * as Stream from "effect/Stream"
import { GenericContainer, Wait } from "testcontainers"

// -----------------------------------------------------------------------------
// Fixture
// -----------------------------------------------------------------------------

class FixtureError extends Data.TaggedError("FixtureError")<{
  readonly description: string
  readonly cause?: unknown
}> {}

/** Creates an unencrypted ed25519 key pair with `ssh-keygen`. */
const generateKey = Effect.fnUntraced(function*(file: string) {
  const spawner = yield* ChildProcessSpawner
  const code = yield* spawner.exitCode(ChildProcess.make("ssh-keygen", ["-q", "-N", "", "-t", "ed25519", "-f", file]))
  if (code !== 0) return yield* new FixtureError({ description: `ssh-keygen exited with ${code}` })
})

/** An OpenSSH server in a container, and the files for connecting to it. */
class Sshd extends Context.Service<Sshd, {
  readonly host: string
  readonly port: number
  /** A private directory for test files. */
  readonly dir: string
  readonly identityFile: string
  readonly knownHostsFile: string
}>()("test/Sshd") {
  static readonly layer = Layer.effect(
    Sshd,
    Effect.gen(function*() {
      const fs = yield* FileSystem.FileSystem
      const path = yield* Path.Path
      const dir = yield* fs.realPath(yield* fs.makeTempDirectoryScoped({ prefix: "effect-openssh-" }))
      const identityFile = path.join(dir, "user_ed25519")
      yield* generateKey(identityFile)
      const authorizedKey = yield* fs.readFileString(`${identityFile}.pub`)
      const context = yield* path.fromFileUrl(new URL("./fixtures/sshd", import.meta.url))
      const container = yield* Effect.acquireRelease(
        Effect.tryPromise({
          try: async () => {
            const image = await GenericContainer.fromDockerfile(context).build("effect-test-sshd", {
              deleteOnExit: false
            })
            return image
              .withCopyContentToContainer([{
                content: authorizedKey,
                target: "/etc/ssh/authorized_keys",
                mode: 0o644
              }])
              .withExposedPorts(22)
              .withWaitStrategy(Wait.forSuccessfulCommand("nc -z 127.0.0.1 22"))
              .start()
          },
          catch: (cause) => new FixtureError({ description: "could not start the sshd container", cause })
        }),
        (container) => Effect.promise(() => container.stop())
      )
      const host = container.getHost()
      const port = container.getMappedPort(22)
      const hostKey = yield* Effect.promise(() => container.exec(["cat", "/etc/ssh/ssh_host_ed25519_key.pub"]))
      const knownHostsFile = path.join(dir, "known_hosts")
      yield* fs.writeFileString(
        knownHostsFile,
        `[${host}]:${port} ${hostKey.output.trim().split(" ").slice(0, 2).join(" ")}\n`
      )
      return { host, port, dir, identityFile, knownHostsFile }
    })
  )
}

const PlatformLayer = NodeChildProcessSpawner.layer.pipe(
  Layer.provideMerge(Layer.mergeAll(NodeFileSystem.layer, NodePath.layer))
)

const TestLayer = Layer.mergeAll(NodeOpenSsh.layer, Sshd.layer).pipe(Layer.provideMerge(PlatformLayer))

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

const decoder = new TextDecoder()
const encoder = new TextEncoder()

/** The timeout of each test. */
const timeout = 60_000

/** The settings for connecting to the fixture sshd. */
const destination = (sshd: Sshd["Service"], overrides: Partial<Ssh.Destination> = {}): Ssh.Destination => ({
  host: { host: sshd.host, port: sshd.port },
  username: "effect",
  ...overrides,
  openSsh: {
    identityFile: sshd.identityFile,
    // Ignore the developer's own configuration for deterministic tests.
    configFile: "/dev/null",
    ...overrides.openSsh,
    options: {
      StrictHostKeyChecking: "yes",
      UserKnownHostsFile: sshd.knownHostsFile,
      IdentitiesOnly: true,
      ...overrides.openSsh?.options
    }
  }
})

/** Opens a connection to the fixture sshd through the `Ssh` factory. */
const connectTo = Effect.fnUntraced(function*(overrides?: Partial<Ssh.Destination>) {
  const ssh = yield* Ssh.Ssh
  return yield* ssh.connect(destination(yield* Sshd, overrides))
})

const connection = connectTo()

/** A command that runs a script with `sh`. */
const sh = (script: string) => SshCommand.make("sh", ["-c", script])

/** A fresh path under `/tmp` inside the container. */
const remotePath = (name: string) => Effect.map(Random.nextInt, (n) => `/tmp/${name}-${n}`)

/** Waits until no remote `sleep <seconds>` process is left. */
const gone = (ssh: Ssh.SshConnection, seconds: number) =>
  ssh.run(sh(`ps -o args | grep -c '^sleep ${seconds}$' || true`)).pipe(
    Effect.map((result) => result.stdout.trim() === "0"),
    Effect.repeat({ until: (done) => done, times: 40, schedule: Schedule.spaced("50 millis") })
  )

/** Reads the first chunk of standard output, such as a `ready` line. */
const firstOutput = (process: Ssh.SshProcess) => Effect.flatMap(Stream.toPull(process.stdout), (pull) => pull)

/** Whether a local process with `pattern` in its command line runs. */
const running = (pattern: string) =>
  Effect.flatMap(ChildProcessSpawner, (spawner) => spawner.exitCode(ChildProcess.make("pgrep", ["-f", pattern])))
    .pipe(Effect.map((code) => code === 0))

// -----------------------------------------------------------------------------
// Tests
// -----------------------------------------------------------------------------

it.layer(TestLayer, { excludeTestServices: true, timeout: "5 minutes" })("NodeOpenSsh (container)", (it) => {
  it.effect("runs commands with arguments, a directory, an environment, and input", () =>
    Effect.gen(function*() {
      const ssh = yield* connection
      assert.deepStrictEqual(yield* ssh.run(sh("echo out; echo err >&2; exit 3")), {
        stdout: "out\n",
        stderr: "err\n",
        exit: { _tag: "ExitStatus", code: 3 }
      })
      // Arguments reach the command unchanged.
      assert.strictEqual(
        (yield* ssh.run(SshCommand.make("printf", ["%s|", "a b", "it's", "$HOME", "`x`", ""]))).stdout,
        "a b|it's|$HOME|`x`||"
      )
      const dir = yield* remotePath("cwd")
      yield* ssh.run(SshCommand.make`mkdir ${dir}`)
      const env = yield* ssh.run(
        SshCommand.make("sh", ["-c", "pwd; echo \"$EFFECT_A\""], { cwd: dir, env: { EFFECT_A: `"quoted" \\ value` } })
      )
      assert.strictEqual(env.stdout, `${dir}\n"quoted" \\ value\n`)
      assert.strictEqual((yield* ssh.run(SshCommand.make`cat`, { stdin: "piped input" })).stdout, "piped input")
    }).pipe(Effect.scoped), timeout)

  it.effect("runs shell code and pipelines", () =>
    Effect.gen(function*() {
      const ssh = yield* connection
      const script = SshCommand.make({ shell: true })`if true; then
        echo "a    b"   # spaces and newlines survive
      fi`
      assert.strictEqual((yield* ssh.run(script)).stdout, "a    b\n")
      // Each part of a pipeline keeps its own directory and environment.
      const dir = yield* remotePath("pipe")
      yield* ssh.run(SshCommand.make`mkdir ${dir}`)
      const pipeline = SshCommand.make({ cwd: dir })`pwd`.pipe(
        SshCommand.pipeTo(
          SshCommand.make("cat; echo $EFFECT_SUFFIX # comment", { shell: true, env: { EFFECT_SUFFIX: "end" } })
        ),
        SshCommand.pipeTo(SshCommand.make`tr a-z A-Z`)
      )
      assert.strictEqual((yield* ssh.run(pipeline)).stdout, `${dir.toUpperCase()}\nEND\n`)
    }).pipe(Effect.scoped), timeout)

  it.effect("rejects NUL characters without disturbing the connection", () =>
    Effect.gen(function*() {
      const ssh = yield* connection
      // OpenSSH servers drop the whole connection on NUL characters.
      assert.strictEqual((yield* Effect.flip(ssh.run(SshCommand.make("echo", ["a\0b"])))).reason, "Channel")
      assert.strictEqual((yield* ssh.run(SshCommand.make`echo still`)).stdout, "still\n")
    }).pipe(Effect.scoped), timeout)

  it.effect("runs commands concurrently with data larger than the channel windows", () =>
    Effect.gen(function*() {
      const ssh = yield* connection
      // Input and output exceed the two megabyte windows of OpenSSH and the
      // client at the same time.
      const results = yield* Effect.forEach(
        [1, 2, 3],
        (i) => Effect.map(ssh.run(SshCommand.make`cat`, { stdin: String(i).repeat(3_000_000) }), (r) => r.stdout),
        { concurrency: "unbounded" }
      )
      assert.deepStrictEqual(results, ["1", "2", "3"].map((s) => s.repeat(3_000_000)))
      // Commands may exit without reading their input.
      const unread = yield* ssh.run(SshCommand.make`true`, { stdin: "x".repeat(3_000_000) })
      assert.deepStrictEqual(unread.exit, { _tag: "ExitStatus", code: 0 })
    }).pipe(Effect.scoped), timeout)

  it.effect("delivers signals", () =>
    Effect.gen(function*() {
      const ssh = yield* connection
      const process = yield* Effect.tap(ssh.exec(sh("echo ready; exec sleep 30")), firstOutput)
      yield* process.signal("TERM")
      assert.deepStrictEqual(yield* process.exit, {
        _tag: "ExitSignal",
        signal: "SIGTERM",
        coreDumped: false,
        message: ""
      })
    }).pipe(Effect.scoped), timeout)

  it.effect("closes commands before they exit", () =>
    Effect.gen(function*() {
      const ssh = yield* connection
      const process = yield* Effect.tap(ssh.exec(sh("echo ready; exec sleep 30")), firstOutput)
      // `sleep` never reads its input, so the write waits until the close.
      const blocked = yield* Effect.forkChild(process.write(new Uint8Array(8_000_000)), { startImmediately: true })
      yield* process.close
      yield* process.closed
      assert.strictEqual((yield* Effect.flip(Fiber.join(blocked))).reason, "Channel")
      assert.strictEqual((yield* Effect.flip(process.exit)).reason, "Channel")
      assert.strictEqual((yield* ssh.run(SshCommand.make`echo still`)).stdout, "still\n")
    }).pipe(Effect.scoped), timeout)

  it.effect("closes interrupted commands without disturbing the connection", () =>
    Effect.gen(function*() {
      const ssh = yield* connection
      // Interruptions at different points: while opening the session, while
      // waiting for replies to its requests, and afterwards.
      for (const millis of [0, 1, 2, 3, 5, 8, 13, 21]) {
        yield* ssh.exec(sh("echo ready; exec sleep 30")).pipe(Effect.timeoutOption(Duration.millis(millis)))
      }
      assert.strictEqual((yield* ssh.run(SshCommand.make`echo still`)).stdout, "still\n")
    }).pipe(Effect.scoped), timeout)

  it.effect("allocates terminals and hangs up their commands on close", () =>
    Effect.gen(function*() {
      const ssh = yield* connection
      const terminal = yield* ssh.run(sh("tty; echo $TERM"), { pty: { term: "vt100" } })
      assert.match(terminal.stdout, /^\/dev\/(pts\/\d+|tty\w+)\r?\nvt100/)
      // A unique duration identifies the remote process.
      const seconds = 700 + (yield* Random.nextIntBetween(0, 99))
      yield* Effect.scoped(Effect.tap(ssh.exec(sh(`echo ready; exec sleep ${seconds}`), { pty: true }), firstOutput))
      assert.isTrue(yield* gone(ssh, seconds))
    }).pipe(Effect.scoped), timeout)

  it.effect("starts subsystems", () =>
    Effect.gen(function*() {
      const ssh = yield* connection
      const echo = yield* ssh.subsystem("echo")
      yield* echo.write("through a subsystem")
      yield* echo.eof
      assert.strictEqual(yield* Stream.mkString(Stream.decodeText(echo.stdout)), "through a subsystem")
      assert.strictEqual((yield* Effect.flip(ssh.subsystem("missing"))).reason, "Channel")
    }).pipe(Effect.scoped), timeout)

  it.effect("forwards TCP connections and Unix sockets", () =>
    Effect.gen(function*() {
      const ssh = yield* connection
      // Echo servers inside the container (see fixtures/sshd).
      const tunnel = yield* ssh.forwardOut("127.0.0.1:7000")
      yield* tunnel.write("over tcp")
      const head = yield* Stream.runHead(tunnel.data)
      assert.strictEqual(decoder.decode(Option.getOrThrow(head)), "over tcp")

      const socket = Ssh.forwardOutSocket(ssh, { path: "/tmp/echo.sock" })
      const pull = yield* Socket.readerBytes(socket)
      const writer = yield* socket.writer
      yield* writer.write(encoder.encode("over unix"))
      assert.strictEqual(decoder.decode((yield* pull)[0]), "over unix")

      assert.strictEqual((yield* Effect.flip(ssh.forwardOut("127.0.0.1:7001"))).reason, "Channel")
    }).pipe(Effect.scoped), timeout)

  it.effect("forwards local connections until both sides end their data", () =>
    Effect.gen(function*() {
      const ssh = yield* connection
      const sshd = yield* Sshd
      const path = `${sshd.dir}/forward-${yield* Random.nextInt}.sock`
      // A local listener whose connections are forwarded, like `ssh -L`, to
      // the echo server in the container.
      const server = yield* NodeSocketServer.make({ path, allowHalfOpen: true })
      yield* server.run((socket) => ssh.forwardSocket(socket, "127.0.0.1:7000")).pipe(Effect.forkScoped)
      const client = yield* NodeSocket.makeNet({ path, allowHalfOpen: true })
      const pull = yield* Socket.readerBytes(client)
      // The client ends its data at once; the echo arrives afterwards, and
      // then the forward ends the client's input too.
      yield* Effect.scoped(
        Effect.flatMap(client.writer, (writer) => writer.write(encoder.encode("over forwardSocket")))
      )
      let received = ""
      yield* Effect.forever(
        Effect.flatMap(
          pull,
          (chunks) => Effect.sync(() => chunks.forEach((chunk) => received += decoder.decode(chunk)))
        )
      ).pipe(
        Effect.catchIf(
          (error) => error.reason._tag === "SocketCloseError" && error.reason.code === 1000,
          () => Effect.void
        )
      )
      assert.strictEqual(received, "over forwardSocket")
    }).pipe(Effect.scoped), timeout)

  it.effect("closes the connection and fails its commands when the master exits", () =>
    Effect.gen(function*() {
      const spawner = yield* ChildProcessSpawner
      // A setting that identifies this connection's master.
      const marker = `EFFECT_MASTER=${yield* Random.nextInt}`
      const ssh = yield* connectTo({ openSsh: { options: { SetEnv: marker } } })
      const process = yield* Effect.tap(ssh.exec(sh("echo ready; exec sleep 30")), firstOutput)
      assert.isTrue(Option.isNone(yield* Effect.timeoutOption(ssh.closed, "50 millis")))
      yield* spawner.exitCode(ChildProcess.make("pkill", ["-f", `SetEnv=${marker}`]))
      yield* ssh.closed
      assert.strictEqual((yield* Effect.flip(process.exit)).reason, "Connection")
      assert.strictEqual((yield* Effect.flip(ssh.run(SshCommand.make`true`))).reason, "Connection")
    }).pipe(Effect.scoped), timeout)

  it.effect("stops the master when connecting fails", () =>
    Effect.gen(function*() {
      // A proxy that never answers keeps the master waiting.
      const proxy = `sleep ${1000 + (yield* Random.nextIntBetween(0, 999))}`
      const error = yield* Effect.flip(
        connectTo({ openSsh: { options: { ProxyCommand: proxy } }, connectTimeout: "1 second" })
      )
      assert.strictEqual(error.reason, "Timeout")
      // The master is gone before the surrounding scope closes.
      assert.isFalse(yield* running(`ProxyCommand=${proxy}`))
    }).pipe(Effect.scoped), timeout)

  it.effect("rejects destination hosts that ssh would read as options", () =>
    Effect.gen(function*() {
      const error = yield* Effect.flip(connectTo({ host: "-oProxyCommand=touch /tmp/pwned" }))
      assert.strictEqual(error.reason, "Connection")
      assert.include(error.description, "invalid destination host")
    }).pipe(Effect.scoped), timeout)

  it.effect("reports authentication failures with ssh diagnostics", () =>
    Effect.gen(function*() {
      const sshd = yield* Sshd
      const path = yield* Path.Path
      const keyFile = path.join(sshd.dir, `unauthorized-${yield* Random.nextInt}`)
      yield* generateKey(keyFile)
      const error = yield* Effect.flip(connectTo({ openSsh: { identityFile: keyFile }, connectTimeout: "10 seconds" }))
      assert.strictEqual(error.reason, "Connection")
      assert.include(error.description, "Permission denied")
    }).pipe(Effect.scoped), timeout)
})
