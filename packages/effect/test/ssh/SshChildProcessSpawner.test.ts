import { assert, describe } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as Fiber from "effect/Fiber"
import * as Layer from "effect/Layer"
import * as ChildProcess from "effect/process/ChildProcess"
import { ChildProcessSpawner } from "effect/process/ChildProcessSpawner"
import * as Queue from "effect/Queue"
import * as Ssh from "effect/ssh/Ssh"
import * as SshChildProcessSpawner from "effect/ssh/SshChildProcessSpawner"
import * as SshClient from "effect/ssh/SshClient"
import * as SshKey from "effect/ssh/SshKey"
import * as Stream from "effect/Stream"
import { CryptoLive, it, runWithCrypto } from "./utils/crypto.ts"
import * as TestServer from "./utils/TestServer.ts"

const hostKey = await runWithCrypto(SshKey.generate("ssh-ed25519"))

/**
 * Interprets the command lines produced by the spawner. Each recognised
 * program is matched against the full command line, so the tests also pin
 * down quoting.
 */
const handler: NonNullable<TestServer.ServerOptions["onSession"]> = (channel, start) =>
  Effect.gen(function*() {
    const line = start.value
    const program = line.replace(/^cd \S+ && /, "").replace(/^exec (env (-i )?(\S+=\S+ )*)?/, "")
    if (program.startsWith("echo-line")) {
      yield* channel.write(line)
      yield* channel.exit(0)
    } else if (program === "cat") {
      yield* Stream.runForEach(Stream.fromQueue(channel.input), (chunk) => channel.write(chunk))
      yield* channel.exit(0)
    } else if (program === "upper") {
      yield* Stream.runForEach(
        Stream.fromQueue(channel.input),
        (chunk) => channel.write(new TextDecoder().decode(chunk).toUpperCase())
      )
      yield* channel.exit(0)
    } else if (program.startsWith("fail")) {
      yield* channel.writeStderr("bad things")
      yield* channel.exit(Number(program.split(" ")[1] ?? 1))
    } else if (program === "both") {
      yield* channel.write("out")
      yield* channel.writeStderr("err")
      yield* channel.exit(0)
    } else if (program === "sleep") {
      const signal = yield* Queue.take(channel.signals)
      yield* channel.request(
        "exit-signal",
        new TextEncoder().encode(
          `\x00\x00\x00${String.fromCharCode(signal.length)}${signal}\x00\x00\x00\x00\x00\x00\x00\x00\x00`
        )
      )
    } else if (program === "ignore-signals") {
      yield* Queue.take(channel.signals)
      // Never exits; the spawner must close the channel.
      return
    } else {
      yield* channel.writeStderr(`not found: ${program}`)
      yield* channel.exit(127)
    }
    yield* channel.eof
    yield* channel.close
  })

const SpawnerLive = Layer.effect(
  ChildProcessSpawner,
  Effect.gen(function*() {
    const { socket } = yield* TestServer.runServer({ hostKey, password: "pw", onSession: handler })
    const client = yield* SshClient.make(socket, {
      host: "test.local",
      username: "tester",
      auth: SshClient.password("pw"),
      verifyHostKey: SshClient.acceptAnyHostKey
    })
    return SshChildProcessSpawner.make(Ssh.fromClient(client))
  })
).pipe(Layer.provide(CryptoLive))

describe("SshChildProcessSpawner", () => {
  describe("commandLine", () => {
    it("quotes arguments for POSIX shells", () => {
      assert.strictEqual(
        SshChildProcessSpawner.commandLine(ChildProcess.make("ls", ["-la", "my file", "it's", "$HOME", ""])),
        `exec ls -la 'my file' 'it'\\''s' '$HOME' ''`
      )
    })

    it("leaves safe arguments unquoted", () => {
      assert.strictEqual(
        SshChildProcessSpawner.commandLine(ChildProcess.make("git", ["log", "--format=%H", "a/b.c", "x@y:z"])),
        "exec git log --format=%H a/b.c x@y:z"
      )
    })

    it("changes directory first", () => {
      assert.strictEqual(
        SshChildProcessSpawner.commandLine(ChildProcess.make("pwd", [], { cwd: "/srv/my app" })),
        `cd '/srv/my app' && exec pwd`
      )
    })

    it("replaces the environment unless extendEnv is set", () => {
      assert.strictEqual(
        SshChildProcessSpawner.commandLine(ChildProcess.make("printenv", [], { env: { A: "1", B: "two words" } })),
        `exec env -i A=1 'B=two words' printenv`
      )
      assert.strictEqual(
        SshChildProcessSpawner.commandLine(
          ChildProcess.make("printenv", [], { env: { A: "1", SKIP: undefined }, extendEnv: true })
        ),
        "exec env A=1 printenv"
      )
    })

    it("passes shell commands through unquoted", () => {
      assert.strictEqual(
        SshChildProcessSpawner.commandLine(ChildProcess.make("echo $HOME | wc -c", [], { shell: true })),
        "echo $HOME | wc -c"
      )
      assert.strictEqual(
        SshChildProcessSpawner.commandLine(ChildProcess.make("echo", ["$HOME"], { shell: "/bin/bash" })),
        `exec /bin/bash -c 'echo $HOME'`
      )
    })
  })

  describe("spawning", () => {
    it.live("closes the channel when the signal is ignored", () =>
      Effect.gen(function*() {
        const handle = yield* ChildProcess.make("ignore-signals")
        yield* handle.kill({ forceKillAfter: "20 millis" })
        const error = yield* Effect.flip(handle.exitCode)
        assert.strictEqual(error._tag, "PlatformError")
      }).pipe(Effect.provide(SpawnerLive)))

    it.layer(SpawnerLive)((it) => {
      it.effect("collects output", () =>
        Effect.gen(function*() {
          const spawner = yield* ChildProcessSpawner
          assert.strictEqual(
            yield* spawner.string(ChildProcess.make("echo-line", ["a b"])),
            `exec echo-line 'a b'`
          )
          assert.deepStrictEqual(
            yield* spawner.lines(ChildProcess.make("echo-line", [], { cwd: "/tmp" })),
            ["cd /tmp && exec echo-line"]
          )
        }))

      it.effect("reports exit codes", () =>
        Effect.gen(function*() {
          const spawner = yield* ChildProcessSpawner
          assert.strictEqual(yield* spawner.exitCode(ChildProcess.make("fail", ["3"])), 3)
          assert.strictEqual(yield* spawner.exitCode(ChildProcess.make("missing")), 127)
        }))

      it.effect("separates and merges stdout and stderr", () =>
        Effect.gen(function*() {
          const spawner = yield* ChildProcessSpawner
          assert.strictEqual(yield* spawner.string(ChildProcess.make("both")), "out")
          const all = yield* spawner.string(ChildProcess.make("both"), { includeStderr: true })
          assert.deepStrictEqual([...all].sort().join(""), [..."outerr"].sort().join(""))
        }))

      it.effect("streams stdin from a Stream", () =>
        Effect.gen(function*() {
          const spawner = yield* ChildProcessSpawner
          const encoder = new TextEncoder()
          const output = yield* spawner.string(
            ChildProcess.make("cat", { stdin: Stream.make(encoder.encode("one "), encoder.encode("two")) })
          )
          assert.strictEqual(output, "one two")
        }))

      it.effect("writes stdin through the handle", () =>
        Effect.gen(function*() {
          const handle = yield* ChildProcess.make("cat")
          const output = yield* Effect.forkChild(Stream.mkString(Stream.decodeText(handle.stdout)))
          yield* Stream.run(Stream.make(new TextEncoder().encode("via sink")), handle.stdin)
          assert.strictEqual(yield* Fiber.join(output), "via sink")
          assert.strictEqual(yield* handle.exitCode, 0)
        }))

      it.effect("pipes commands", () =>
        Effect.gen(function*() {
          const spawner = yield* ChildProcessSpawner
          const encoder = new TextEncoder()
          const output = yield* spawner.string(
            ChildProcess.make("cat", { stdin: Stream.make(encoder.encode("piped")) }).pipe(
              ChildProcess.pipeTo(ChildProcess.make("upper"))
            )
          )
          assert.strictEqual(output, "PIPED")
        }))

      it.effect("pipes stderr when requested", () =>
        Effect.gen(function*() {
          const spawner = yield* ChildProcessSpawner
          const output = yield* spawner.string(
            ChildProcess.make("fail").pipe(ChildProcess.pipeTo(ChildProcess.make("upper"), { from: "stderr" }))
          )
          assert.strictEqual(output, "BAD THINGS")
        }))

      it.effect("kills with a signal", () =>
        Effect.gen(function*() {
          const handle = yield* ChildProcess.make("sleep")
          assert.isTrue(yield* handle.isRunning)
          yield* handle.kill({ killSignal: "SIGINT" })
          assert.isFalse(yield* handle.isRunning)
          const error = yield* Effect.flip(handle.exitCode)
          assert.include(error.message, "SIGINT")
        }))

      it.effect("rejects additional file descriptors", () =>
        Effect.gen(function*() {
          const spawner = yield* ChildProcessSpawner
          const error = yield* Effect.flip(
            spawner.exitCode(ChildProcess.make("cat", { additionalFds: { fd3: { type: "output" } } }))
          )
          assert.strictEqual(error.reason._tag, "BadArgument")
        }))
    })
  })
})
