/**
 * End-to-end tests of `NodeOpenSsh` against an OpenSSH server running in a
 * container (see `fixtures/sshd`), driven by the host's `ssh` and
 * `ssh-keygen` executables.
 */
import * as NodeChildProcessSpawner from "@effect/platform-node-shared/NodeChildProcessSpawner"
import * as NodeFileSystem from "@effect/platform-node-shared/NodeFileSystem"
import * as NodeOpenSsh from "@effect/platform-node-shared/NodeOpenSsh"
import * as NodePath from "@effect/platform-node-shared/NodePath"
import { assert, it } from "@effect/vitest"
import * as Context from "effect/Context"
import * as Data from "effect/Data"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
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
  identityFile: sshd.identityFile,
  // Ignore the developer's own configuration for deterministic tests.
  configFile: "/dev/null",
  options: {
    StrictHostKeyChecking: "yes",
    UserKnownHostsFile: sshd.knownHostsFile,
    IdentitiesOnly: true
  },
  ...overrides
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
  it.effect("runs commands with arguments, a directory, and an environment", () =>
    Effect.gen(function*() {
      const ssh = yield* connection
      assert.deepStrictEqual(yield* ssh.run(sh("echo out; echo err >&2; exit 3")), {
        stdout: "out\n",
        stderr: "err\n",
        exit: { _tag: "ExitStatus", code: 3 }
      })
      // Arguments reach the command unchanged.
      assert.strictEqual(
        (yield* ssh.run(SshCommand.make("printf", ["%s|", "a b", "it's", "$HOME", "`x`", "=x", ""]))).stdout,
        "a b|it's|$HOME|`x`|=x||"
      )
      const dir = yield* remotePath("cwd")
      assert.deepStrictEqual((yield* ssh.run(SshCommand.make`mkdir ${dir}`)).exit, { _tag: "ExitStatus", code: 0 })
      assert.strictEqual((yield* ssh.run(SshCommand.make({ cwd: dir })`pwd`)).stdout.trim(), dir)
      const env = yield* ssh.run(
        SshCommand.make("sh", ["-c", "echo \"[$EFFECT_A] [$EFFECT_B] [${HOME:+home}]\""], {
          env: { EFFECT_A: "plain", EFFECT_B: `with "quotes" and \\ backslash` }
        })
      )
      assert.strictEqual(env.stdout, `[plain] [with "quotes" and \\ backslash] [home]\n`)
      assert.strictEqual((yield* ssh.run(SshCommand.make("echo a b | tr a-z A-Z", { shell: true }))).stdout, "A B\n")
      // Shell code keeps its directory and environment throughout.
      const code = SshCommand.make("pwd; echo $EFFECT_A", { shell: true, cwd: dir, env: { EFFECT_A: "a" } })
      assert.strictEqual((yield* ssh.run(code)).stdout, `${dir}\na\n`)
      const missing = yield* ssh.run(SshCommand.make("false || echo ran", { shell: true, cwd: `${dir}/missing` }))
      assert.strictEqual(missing.stdout, "")
      assert.notDeepEqual(missing.exit, { _tag: "ExitStatus", code: 0 })
      // Relative directories are relative to the home directory.
      const relative = `-dir-${yield* Random.nextInt}`
      yield* ssh.run(SshCommand.make("mkdir", ["--", relative]))
      assert.strictEqual((yield* ssh.run(SshCommand.make({ cwd: relative })`pwd`)).stdout, `/home/effect/${relative}\n`)
      const invalid = yield* Effect.flip(ssh.run(SshCommand.make("true", { env: { "EFFECT-A": "a" } })))
      assert.strictEqual(invalid.reason, "Channel")
      assert.strictEqual((yield* ssh.run(SshCommand.make("echo", ["$0"], { shell: "/bin/sh" }))).stdout, "/bin/sh\n")
      assert.strictEqual((yield* ssh.run(SshCommand.make`cat`, { stdin: "piped input" })).stdout, "piped input")
    }).pipe(Effect.scoped), timeout)

  it.effect("builds commands from templates and pipelines", () =>
    Effect.gen(function*() {
      const ssh = yield* connection
      const words = ["it's", "a b"]
      // Interpolated values stay single arguments.
      assert.strictEqual((yield* ssh.run(SshCommand.make`printf %s| ${words} ${"$HOME"}`)).stdout, "it's|a b|$HOME|")
      // Each part of a pipeline keeps its own directory and environment.
      const dir = yield* remotePath("pipe")
      yield* ssh.run(SshCommand.make`mkdir ${dir}`)
      const pipeline = SshCommand.make({ cwd: dir })`pwd`.pipe(
        SshCommand.pipeTo(
          SshCommand.make("sh", ["-c", "cat; echo $EFFECT_SUFFIX"], { env: { EFFECT_SUFFIX: "end" } })
        ),
        SshCommand.pipeTo(SshCommand.make`tr a-z A-Z`)
      )
      assert.strictEqual((yield* ssh.run(pipeline)).stdout, `${dir.toUpperCase()}\nEND\n`)
    }).pipe(Effect.scoped), timeout)

  it.effect("runs many commands concurrently", () =>
    Effect.gen(function*() {
      const ssh = yield* connection
      const results = yield* Effect.forEach(
        Array.from({ length: 12 }, (_, i) => i),
        (i) => Effect.map(ssh.run(SshCommand.make`echo ${i}`), (result) => result.stdout.trim()),
        { concurrency: "unbounded" }
      )
      assert.deepStrictEqual(results, Array.from({ length: 12 }, (_, i) => String(i)))
    }).pipe(Effect.scoped), timeout)

  it.effect("streams data larger than the channel windows", () =>
    Effect.gen(function*() {
      const ssh = yield* connection
      // Both directions exceed the two megabyte windows of OpenSSH and the client.
      const output = yield* ssh.run(SshCommand.make`head -c 5000000 /dev/zero`)
      assert.strictEqual(output.stdout.length, 5_000_000)
      const input = yield* ssh.run(SshCommand.make`wc -c`, { stdin: "x".repeat(3_000_000) })
      assert.strictEqual(input.stdout.trim(), "3000000")
      // Input and output fill both windows at the same time.
      const echoed = yield* ssh.run(SshCommand.make`cat`, { stdin: "x".repeat(6_000_000) })
      assert.strictEqual(echoed.stdout.length, 6_000_000)
      // Commands may exit without reading their input.
      const unread = yield* ssh.run(SshCommand.make`true`, { stdin: "x".repeat(3_000_000) })
      assert.deepStrictEqual(unread.exit, { _tag: "ExitStatus", code: 0 })
    }).pipe(Effect.scoped), timeout)

  it.effect("delivers signals", () =>
    Effect.gen(function*() {
      const ssh = yield* connection
      const terminated = yield* Effect.tap(ssh.exec(sh("echo ready; exec sleep 30")), firstOutput)
      yield* terminated.signal("SIGTERM")
      assert.deepStrictEqual(yield* terminated.exit, {
        _tag: "ExitSignal",
        signal: "SIGTERM",
        coreDumped: false,
        message: ""
      })
      // Commands that ignore SIGTERM still receive SIGKILL.
      const stubborn = yield* Effect.tap(ssh.exec(sh("trap '' TERM; echo ready; exec sleep 30")), firstOutput)
      yield* stubborn.signal("TERM")
      yield* stubborn.signal("KILL")
      assert.include(yield* stubborn.exit, { _tag: "ExitSignal", signal: "SIGKILL" })
    }).pipe(Effect.scoped), timeout)

  it.effect("closes commands before they exit", () =>
    Effect.gen(function*() {
      const ssh = yield* connection
      const process = yield* Effect.tap(ssh.exec(sh("echo ready; exec sleep 30")), firstOutput)
      yield* process.close
      assert.strictEqual((yield* Effect.flip(process.exit)).reason, "Channel")
      assert.strictEqual((yield* Effect.flip(process.write("late"))).reason, "Channel")
      // The connection stays usable.
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

  it.effect("fails channels the server cannot open", () =>
    Effect.gen(function*() {
      const ssh = yield* connection
      assert.strictEqual((yield* Effect.flip(ssh.forwardOut("127.0.0.1:7001"))).reason, "Channel")
      assert.strictEqual((yield* Effect.flip(ssh.subsystem("missing"))).reason, "Channel")
      assert.strictEqual((yield* ssh.run(SshCommand.make`echo still`)).stdout, "still\n")
    }).pipe(Effect.scoped), timeout)

  it.effect("forwards the agent", () =>
    Effect.gen(function*() {
      const sshd = yield* Sshd
      const spawner = yield* ChildProcessSpawner
      const fs = yield* FileSystem.FileSystem
      const path = yield* Path.Path
      const agent = path.join(sshd.dir, `agent-${yield* Random.nextInt}.sock`)
      yield* spawner.spawn(ChildProcess.make("ssh-agent", ["-D", "-a", agent]))
      yield* fs.exists(agent).pipe(Effect.repeat({ until: (exists) => exists, schedule: Schedule.spaced("20 millis") }))
      const socket = sh("echo \"[$SSH_AUTH_SOCK]\"")
      const forwarded = yield* connectTo({
        forwardAgent: true,
        options: { ...destination(sshd).options, ForwardAgent: agent }
      })
      assert.match((yield* forwarded.run(socket)).stdout, /^\[\/.+\]\n$/)
      assert.strictEqual((yield* (yield* connection).run(socket)).stdout, "[]\n")
    }).pipe(Effect.scoped), timeout)

  it.effect("fails commands when the master exits", () =>
    Effect.gen(function*() {
      const sshd = yield* Sshd
      const spawner = yield* ChildProcessSpawner
      // A setting that identifies this connection's master.
      const marker = `EFFECT_MASTER=${yield* Random.nextInt}`
      const ssh = yield* connectTo({ options: { ...destination(sshd).options, SetEnv: marker } })
      const process = yield* Effect.tap(ssh.exec(sh("echo ready; exec sleep 30")), firstOutput)
      yield* spawner.exitCode(ChildProcess.make("pkill", ["-f", `SetEnv=${marker}`]))
      const error = yield* Effect.flip(process.exit)
      assert.strictEqual(error.reason, "Connection")
      assert.include(error.description, "the OpenSSH master closed the connection")
    }).pipe(Effect.scoped), timeout)

  it.effect("stops the master when connecting fails", () =>
    Effect.gen(function*() {
      const sshd = yield* Sshd
      // A proxy that never answers keeps the master waiting.
      const proxy = `sleep ${1000 + (yield* Random.nextIntBetween(0, 999))}`
      const error = yield* Effect.flip(
        connectTo({ options: { ...destination(sshd).options, ProxyCommand: proxy }, connectTimeout: "1 second" })
      )
      assert.strictEqual(error.reason, "Timeout")
      // The master is gone before the surrounding scope closes.
      assert.isFalse(yield* running(`ProxyCommand=${proxy}`))
    }).pipe(Effect.scoped), timeout)

  it.effect("answers the server's keepalive requests", () =>
    Effect.gen(function*() {
      const ssh = yield* connection
      // The server probes the idle session every second and disconnects
      // after three unanswered probes (see fixtures/sshd).
      assert.strictEqual((yield* ssh.run(sh("sleep 5; echo alive"))).stdout, "alive\n")
    }).pipe(Effect.scoped), timeout)

  it.effect("allocates terminals", () =>
    Effect.gen(function*() {
      const ssh = yield* connection
      const terminal = yield* ssh.run(sh("tty; echo $TERM"), { pty: { term: "vt100" } })
      assert.match(terminal.stdout, /^\/dev\/(pts\/\d+|tty\w+)\r?\nvt100/)
    }).pipe(Effect.scoped), timeout)

  it.effect("interrupts and hangs up commands with a terminal", () =>
    Effect.gen(function*() {
      const ssh = yield* connection
      // Unique durations identify the remote processes.
      const interruptedFor = 600 + (yield* Random.nextIntBetween(0, 99))
      const hungUpFor = 700 + (yield* Random.nextIntBetween(0, 99))
      const start = (seconds: number) =>
        Effect.tap(ssh.exec(sh(`echo ready; exec sleep ${seconds}`), { pty: true }), firstOutput)

      // Writing ^C interrupts the command like Ctrl-C.
      const interrupted = yield* start(interruptedFor)
      yield* interrupted.write("\x03")
      yield* interrupted.exit
      assert.isTrue(yield* gone(ssh, interruptedFor))

      // Closing the session hangs up the command.
      yield* Effect.scoped(start(hungUpFor))
      assert.isTrue(yield* gone(ssh, hungUpFor))
    }).pipe(Effect.scoped), timeout)

  it.effect("starts subsystems", () =>
    Effect.gen(function*() {
      const ssh = yield* connection
      const echo = yield* ssh.subsystem("echo")
      yield* echo.write("through a subsystem")
      yield* echo.eof
      assert.strictEqual(yield* Stream.mkString(Stream.decodeText(echo.stdout)), "through a subsystem")
    }).pipe(Effect.scoped), timeout)

  it.effect("forwards TCP connections and Unix sockets", () =>
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
      const error = yield* Effect.flip(connectTo({ identityFile: keyFile, connectTimeout: "10 seconds" }))
      assert.strictEqual(error.reason, "Connection")
      assert.include(error.description, "Permission denied")
    }).pipe(Effect.scoped), timeout)

  it.effect("rejects unknown host keys", () =>
    Effect.gen(function*() {
      const sshd = yield* Sshd
      const fs = yield* FileSystem.FileSystem
      const path = yield* Path.Path
      const knownHostsFile = path.join(sshd.dir, "empty_known_hosts")
      yield* fs.writeFileString(knownHostsFile, "")
      const error = yield* Effect.flip(
        connectTo({ options: { ...destination(sshd).options, UserKnownHostsFile: knownHostsFile } })
      )
      assert.strictEqual(error.reason, "Connection")
    }).pipe(Effect.scoped), timeout)
})
