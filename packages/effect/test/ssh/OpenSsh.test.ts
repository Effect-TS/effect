import { assert, describe, it } from "@effect/vitest"
import * as Deferred from "effect/Deferred"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as FileSystem from "effect/FileSystem"
import * as Layer from "effect/Layer"
import type * as PlatformError from "effect/PlatformError"
import * as ChildProcess from "effect/process/ChildProcess"
import {
  ChildProcessSpawner,
  ExitCode,
  make as makeSpawner,
  makeHandle,
  ProcessId
} from "effect/process/ChildProcessSpawner"
import * as Sink from "effect/Sink"
import * as OpenSsh from "effect/ssh/OpenSsh"
import * as SshChildProcessSpawner from "effect/ssh/SshChildProcessSpawner"
import * as Stream from "effect/Stream"

const encoder = new TextEncoder()
const decoder = new TextDecoder()

interface Invocation {
  readonly args: ReadonlyArray<string>
  readonly env: Record<string, string | undefined> | undefined
}

interface FakeOptions {
  /** Diagnostics printed by a master that exits immediately. */
  readonly masterFails?: string
  /** Never report the master as ready. */
  readonly neverReady?: boolean
  /** Remote process id reported by wrapped commands. */
  readonly remotePid?: number
}

/**
 * A `ChildProcessSpawner` that impersonates `ssh`: it records every
 * invocation and emulates the master connection, `-O check`, and a few
 * remote commands.
 */
const makeFakeSsh = (options: FakeOptions = {}) => {
  const invocations: Array<Invocation> = []
  const signals: Array<string> = []
  const spawner = makeSpawner((command) =>
    Effect.gen(function*() {
      if (command._tag !== "StandardCommand") return yield* Effect.die("unexpected pipeline")
      const args = command.args
      invocations.push({ args, env: command.options.env })
      const killed = Deferred.makeUnsafe<number>()
      const stdin = command.options.stdin
      const input = Stream.isStream(stdin) ? stdin : Stream.empty
      const process = (result: {
        readonly stdout?: Stream.Stream<Uint8Array, PlatformError.PlatformError> | string
        readonly stderr?: string
        readonly exit?: number
        readonly running?: boolean
      }) => {
        const exitCode = result.running === true
          ? Effect.map(Deferred.await(killed), ExitCode)
          : Effect.succeed(ExitCode(result.exit ?? 0))
        const stdout = typeof result.stdout === "string"
          ? Stream.make(encoder.encode(result.stdout))
          : result.stdout ?? Stream.empty
        return makeHandle({
          pid: ProcessId(1),
          exitCode,
          isRunning: Effect.sync(() => result.running === true && !Deferred.isDoneUnsafe(killed)),
          kill: () => Effect.sync(() => Deferred.doneUnsafe(killed, Effect.succeed(143))),
          stdin: Sink.drain,
          stdout,
          stderr: result.stderr === undefined ? Stream.empty : Stream.make(encoder.encode(result.stderr)),
          all: Stream.empty,
          getInputFd: () => Sink.drain,
          getOutputFd: () => Stream.empty,
          unref: Effect.succeed(Effect.void)
        })
      }
      if (args.includes("ControlMaster=yes")) {
        return options.masterFails === undefined
          ? process({ running: true })
          : process({ stderr: options.masterFails, exit: 255 })
      }
      if (args.includes("-O")) return process({ exit: options.neverReady === true ? 255 : 0 })
      const remote = args[args.length - 1]
      if (remote.startsWith("exec sh -c ")) {
        // A command wrapped by the remote spawner to report its process id.
        const pid = options.remotePid ?? 4242
        return process({ stderr: `\x1eEFFECT_SSH_PID ${pid}\nwarning\n`, stdout: "wrapped output", exit: 0 })
      }
      if (remote.startsWith("kill -")) {
        signals.push(remote)
        return process({ exit: 0 })
      }
      if (remote === "cat") return process({ stdout: input })
      if (remote.startsWith("echo ")) return process({ stdout: remote.slice(5) + "\n", exit: 0 })
      if (remote.startsWith("exit ")) return process({ exit: Number(remote.slice(5)) })
      return process({ exit: 0 })
    })
  )
  return { invocations, signals, spawner }
}

const FileSystemTest = FileSystem.layerNoop({
  makeTempDirectoryScoped: () => Effect.succeed("/tmp/effect-ssh-test")
})

const provide = (fake: ReturnType<typeof makeFakeSsh>) =>
  Effect.provide(Layer.merge(Layer.succeed(ChildProcessSpawner, fake.spawner), FileSystemTest))

const lastArgs = (fake: ReturnType<typeof makeFakeSsh>) => fake.invocations[fake.invocations.length - 1].args

const baseOptions: OpenSsh.Options & { readonly host: string } = {
  host: "example.com",
  user: "deploy",
  port: 2222,
  identityFile: "/keys/id",
  options: { StrictHostKeyChecking: "yes", Compression: true },
  args: ["-F", "/etc/ssh/custom"]
}

/** Opens a connection through the factory, splitting the host from the defaults. */
const openConnection = ({ host, ...defaults }: OpenSsh.Options & { readonly host: string }) =>
  Effect.flatMap(OpenSsh.make(defaults), (ssh) => ssh.connect({ host }))

describe("OpenSsh", () => {
  it.effect("starts a shared master connection", () =>
    Effect.gen(function*() {
      const fake = makeFakeSsh()
      yield* openConnection(baseOptions).pipe(provide(fake))
      const [master, check] = fake.invocations
      assert.deepStrictEqual(master.args, [
        "-o",
        "ControlPath=/tmp/effect-ssh-test/control",
        "-o",
        "ControlMaster=yes",
        "-o",
        "ControlPersist=no",
        "-p",
        "2222",
        "-l",
        "deploy",
        "-i",
        "/keys/id",
        "-o",
        "StrictHostKeyChecking=yes",
        "-o",
        "Compression=yes",
        "-o",
        "BatchMode=yes",
        "-o",
        "LogLevel=ERROR",
        "-F",
        "/etc/ssh/custom",
        "-N",
        "-T",
        "example.com"
      ])
      assert.deepStrictEqual(check.args.slice(-3), ["-O", "check", "example.com"])
    }))

  it.effect("runs commands over the shared connection", () =>
    Effect.gen(function*() {
      const fake = makeFakeSsh()
      const ssh = yield* openConnection(baseOptions).pipe(provide(fake))
      assert.strictEqual(ssh.backend, "openssh")
      assert.deepStrictEqual(ssh.capabilities, { signals: false, exitSignals: false })
      const result = yield* ssh.run("echo hello").pipe(provide(fake))
      assert.deepStrictEqual(result, { stdout: "hello\n", stderr: "", exit: { _tag: "ExitStatus", code: 0 } })
      const args = lastArgs(fake)
      assert.deepStrictEqual(args.slice(0, 4), [
        "-o",
        "ControlPath=/tmp/effect-ssh-test/control",
        "-o",
        "ControlMaster=no"
      ])
      assert.deepStrictEqual(args.slice(-4), ["-T", "example.com", "--", "echo hello"])
      assert.deepStrictEqual((yield* ssh.run("exit 7")).exit, { _tag: "ExitStatus", code: 7 })
    }))

  it.effect("opens one master per connection with per-destination overrides", () =>
    Effect.gen(function*() {
      const fake = makeFakeSsh()
      const ssh = yield* OpenSsh.make({ user: "deploy", port: 2222 }).pipe(provide(fake))
      yield* ssh.connect({ host: "web1" })
      yield* ssh.connect({ host: "web2", port: 2200, username: "admin" })
      const masters = fake.invocations.filter((invocation) => invocation.args.includes("ControlMaster=yes"))
      assert.strictEqual(masters.length, 2)
      const [first, second] = masters.map((master) => master.args.join(" "))
      assert.include(first, "-p 2222 -l deploy")
      assert.isTrue(first.endsWith("web1"))
      assert.include(second, "-p 2200 -l admin")
      assert.isTrue(second.endsWith("web2"))
    }).pipe(Effect.scoped))

  it.effect("streams standard input", () =>
    Effect.gen(function*() {
      const fake = makeFakeSsh()
      const ssh = yield* openConnection({ host: "h" }).pipe(provide(fake))
      assert.strictEqual((yield* ssh.run("cat", { stdin: "via stdin" })).stdout, "via stdin")
    }))

  it.effect("maps terminal, agent, and environment options", () =>
    Effect.gen(function*() {
      const fake = makeFakeSsh()
      const ssh = yield* openConnection({ host: "h" }).pipe(provide(fake))
      yield* ssh.run("echo tty", { pty: { term: "vt100" }, forwardAgent: true })
      assert.isTrue(lastArgs(fake).includes("-tt"))
      assert.isTrue(lastArgs(fake).includes("-A"))
      assert.deepStrictEqual(fake.invocations[fake.invocations.length - 1].env, { TERM: "vt100" })

      yield* ssh.run("echo env", { env: { A: "1", B: `say "hi" \\ there` } })
      const args = lastArgs(fake)
      assert.isTrue(args.includes(`SetEnv=A="1" B="say \\"hi\\" \\\\ there"`))
      // Multiplexed sessions cannot carry environment variables.
      assert.isFalse(args.some((arg) => arg.startsWith("ControlPath=")))
    }))

  it.effect("starts subsystems and tunnels", () =>
    Effect.gen(function*() {
      const fake = makeFakeSsh()
      const ssh = yield* openConnection({ host: "h" }).pipe(provide(fake))
      yield* Effect.scoped(ssh.subsystem("sftp"))
      assert.deepStrictEqual(lastArgs(fake).slice(-4), ["-T", "-s", "h", "sftp"])
      yield* Effect.scoped(ssh.forwardOut({ host: "db", port: 5432 }))
      assert.deepStrictEqual(lastArgs(fake).slice(-4), ["-T", "-W", "db:5432", "h"])
      yield* Effect.scoped(ssh.forwardOut({ socketPath: "/run/app.sock" }))
      assert.deepStrictEqual(lastArgs(fake).slice(-4), ["-T", "-W", "/run/app.sock", "h"])
    }))

  it.effect("cannot deliver signals", () =>
    Effect.gen(function*() {
      const fake = makeFakeSsh()
      const ssh = yield* openConnection({ host: "h" }).pipe(provide(fake))
      const process = yield* ssh.exec("echo x")
      const error = yield* Effect.flip(process.signal("SIGTERM"))
      assert.strictEqual(error.reason._tag, "SshChannelError")
    }))

  it.effect("skips the master connection without multiplexing", () =>
    Effect.gen(function*() {
      const fake = makeFakeSsh()
      const ssh = yield* openConnection({ host: "h", multiplex: false, batchMode: false }).pipe(provide(fake))
      yield* ssh.run("echo x")
      assert.strictEqual(fake.invocations.length, 1)
      assert.isFalse(lastArgs(fake).some((arg) => arg.startsWith("ControlPath=")))
      assert.isFalse(lastArgs(fake).includes("BatchMode=yes"))
    }))

  it.effect("reports master failures with ssh diagnostics", () =>
    Effect.gen(function*() {
      const fake = makeFakeSsh({ masterFails: "deploy@example.com: Permission denied (publickey)." })
      const error = yield* Effect.flip(openConnection(baseOptions).pipe(provide(fake)))
      assert.strictEqual(error.reason._tag, "SshConnectionError")
      assert.include(String((error.reason as { readonly cause: unknown }).cause), "Permission denied")
    }))

  it.live("times out when the master never becomes ready", () =>
    Effect.gen(function*() {
      const fake = makeFakeSsh({ neverReady: true })
      const error = yield* Effect.flip(
        openConnection({ host: "h", connectTimeout: Duration.millis(100) }).pipe(provide(fake))
      )
      assert.strictEqual(error.reason._tag, "SshTimeoutError")
    }))

  it.effect("lets the remote spawner signal remote process ids", () =>
    Effect.gen(function*() {
      const fake = makeFakeSsh({ remotePid: 31337 })
      const ssh = yield* openConnection({ host: "h" }).pipe(provide(fake))
      const spawner = SshChildProcessSpawner.make(ssh)
      const handle = yield* spawner.spawn(ChildProcess.make("sleep", ["30"], { cwd: "/srv" }))
      assert.strictEqual(handle.pid, 31337)
      const remote = lastArgs(fake)[lastArgs(fake).length - 1]
      assert.strictEqual(
        remote,
        `exec sh -c 'echo "\x1eEFFECT_SSH_PID $$" >&2; cd "$1" || exit 127; shift; exec "$@"' sh /srv sleep 30`
      )
      // The report is stripped from standard error.
      assert.strictEqual(decoder.decode((yield* Stream.runCollect(handle.stderr))[0]), "warning\n")
      assert.strictEqual(yield* Stream.mkString(Stream.decodeText(handle.stdout)), "wrapped output")
      yield* handle.kill({ forceKillAfter: Duration.zero })
      assert.include(fake.signals[0], "kill -TERM -- -31337")
    }).pipe(Effect.scoped))
})
