import * as NodeCommandExecutor from "@effect/platform-node-shared/NodeCommandExecutor"
import * as NodeFileSystem from "@effect/platform-node-shared/NodeFileSystem"
import * as NodePath from "@effect/platform-node-shared/NodePath"
import * as Command from "@effect/platform/Command"
import type * as CommandExecutor from "@effect/platform/CommandExecutor"
import { SystemError } from "@effect/platform/Error"
import * as FileSystem from "@effect/platform/FileSystem"
import * as Path from "@effect/platform/Path"
import * as Array from "effect/Array"
import * as Chunk from "effect/Chunk"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Fiber from "effect/Fiber"
import { pipe } from "effect/Function"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as Order from "effect/Order"
import * as Stream from "effect/Stream"
import { describe, expect, it } from "vitest"

const TEST_BASH_SCRIPTS_PATH = [__dirname, "fixtures", "bash"]

const TestLive = NodeCommandExecutor.layer.pipe(
  Layer.provideMerge(NodeFileSystem.layer),
  Layer.merge(NodePath.layer)
)

const runPromise = <E, A>(
  self: Effect.Effect<A, E, CommandExecutor.CommandExecutor | FileSystem.FileSystem | Path.Path>
) => Effect.runPromise(Effect.provide(self, TestLive))

describe("Command", () => {
  it("should convert stdout to a string", () =>
    runPromise(Effect.gen(function*(_) {
      const command = Command.make("echo", "-n", "test")
      const result = yield* _(Command.string(command))
      expect(result).toEqual("test")
    })))

  it("should convert stdout to a list of lines", () =>
    runPromise(Effect.gen(function*(_) {
      const command = Command.make("echo", "-n", "1\n2\n3")
      const result = yield* _(Command.lines(command))
      expect(result).toEqual(["1", "2", "3"])
    })))

  it("should stream lines of output", () =>
    runPromise(Effect.gen(function*(_) {
      const command = Command.make("echo", "-n", "1\n2\n3")
      const result = yield* _(Stream.runCollect(Command.streamLines(command)))
      expect(Chunk.toReadonlyArray(result)).toEqual(["1", "2", "3"])
    })))

  it("should work with a Stream directly", () =>
    runPromise(Effect.gen(function*(_) {
      const decoder = new TextDecoder("utf-8")
      const command = Command.make("echo", "-n", "1\n2\n3")
      const result = yield* _(
        Command.stream(command),
        Stream.mapChunks(Chunk.map((bytes) => decoder.decode(bytes))),
        Stream.splitLines,
        Stream.runCollect
      )
      expect(Chunk.toReadonlyArray(result)).toEqual(["1", "2", "3"])
    })))

  it("should fail when trying to run a command that does not exist", () =>
    runPromise(Effect.gen(function*(_) {
      const command = Command.make("some-invalid-command", "test")
      const result = yield* _(Effect.exit(Command.string(command)))
      expect(result).toEqual(Exit.fail(SystemError({
        reason: "NotFound",
        module: "Command",
        method: "spawn",
        pathOrDescriptor: "some-invalid-command test",
        syscall: "spawn some-invalid-command",
        message: "spawn some-invalid-command ENOENT"
      })))
    })))

  it("should pass environment variables", () =>
    runPromise(Effect.gen(function*(_) {
      const command = pipe(
        Command.make("bash", "-c", "echo -n \"var = $VAR\""),
        Command.env({ VAR: "myValue" })
      )
      const result = yield* _(Command.string(command))
      expect(result).toBe("var = myValue")
    })))

  it("should accept streaming stdin", () =>
    runPromise(Effect.gen(function*(_) {
      const stdin = Stream.make(Buffer.from("a b c", "utf-8"))
      const command = pipe(Command.make("cat"), Command.stdin(stdin))
      const result = yield* _(Command.string(command))
      expect(result).toEqual("a b c")
    })))

  it("should accept string stdin", () =>
    runPromise(Effect.gen(function*(_) {
      const stdin = "piped in"
      const command = pipe(Command.make("cat"), Command.feed(stdin))
      const result = yield* _(Command.string(command))
      expect(result).toEqual("piped in")
    })))

  it("should set the working directory", () =>
    runPromise(Effect.gen(function*(_) {
      const path = yield* _(Path.Path)
      const command = pipe(
        Command.make("ls"),
        Command.workingDirectory(path.join(__dirname, "..", "src"))
      )
      const result = yield* _(Command.lines(command))
      expect(result).toContain("NodeCommandExecutor.ts")
    })))

  it("should be able to fall back to a different program", () =>
    runPromise(Effect.gen(function*(_) {
      const command = Command.make("custom-echo", "-n", "test")
      const result = yield* _(
        Command.string(command),
        Effect.catchTag("SystemError", (error) => {
          if (error.reason === "NotFound") {
            return Command.string(Command.make("echo", "-n", "test"))
          }
          return Effect.fail(error)
        })
      )
      expect(result).toBe("test")
    })))

  it("should interrupt a process manually", () =>
    runPromise(Effect.gen(function*(_) {
      const command = Command.make("sleep", "20")
      const result = yield* _(
        Effect.fork(Command.exitCode(command)),
        Effect.flatMap((fiber) => Effect.fork(Fiber.interrupt(fiber))),
        Effect.flatMap(Fiber.join)
      )
      expect(Exit.isInterrupted(result)).toBe(true)
    })))

  // TODO: figure out how to get access to TestClock
  // it("should interrupt a process due to a timeout", () =>
  // T.gen(function* (_) {
  //   const testClock = yield* _(TestClock)

  //   const command = pipe(
  //     Command.make("sleep", "20"),
  //     Command.exitCode,
  //     T.timeout(5000)
  //   )

  //   const output = yield* _(
  //     pipe(
  //       T.do,
  //       T.bind("fiber", () => T.fork(command)),
  //       T.bind("adjustFiber", () => T.fork(testClock.adjust(5000))),
  //       T.tap(() => T.sleep(5000)),
  //       T.chain(({ adjustFiber, fiber }) =>
  //         pipe(
  //           F.join(adjustFiber),
  //           T.chain(() => F.join(fiber))
  //         )
  //       )
  //     )
  //   )

  //   expect(O.isNone(output)).toBeTruthy()
  // }))

  // TODO: this test is flaky
  // it("should capture stderr and stdout separately", () =>
  //   runPromise(Effect.gen(function*(_) {
  //     const command = pipe(
  //       Command.make("./duplex.sh"),
  //       Command.workingDirectory(TEST_BASH_SCRIPTS_DIRECTORY)
  //     )
  //     const process = yield* _(Command.start(command))
  //     const result = yield* _(pipe(
  //       process.stdout,
  //       Stream.zip(process.stderr),
  //       Stream.runCollect,
  //       Effect.map((bytes) => {
  //         const decoder = new TextDecoder("utf-8")
  //         return Array.from(bytes).flatMap(([left, right]) =>
  //           [
  //             decoder.decode(left),
  //             decoder.decode(right)
  //           ] as const
  //         )
  //       })
  //     ))
  //     expect(result).toEqual([
  //       "stdout1\nstdout2\n",
  //       "stderr1\nstderr2\n"
  //     ])
  //   })))

  it("should return non-zero exit code in success channel", () =>
    runPromise(Effect.gen(function*(_) {
      const path = yield* _(Path.Path)
      const command = pipe(
        Command.make("./non-zero-exit.sh"),
        Command.workingDirectory(path.join(...TEST_BASH_SCRIPTS_PATH))
      )
      const result = yield* _(Command.exitCode(command))
      expect(result).toBe(1)
    })))

  it("should throw permission denied as a typed error", () =>
    runPromise(Effect.gen(function*(_) {
      const path = yield* _(Path.Path)
      const command = pipe(
        Command.make("./no-permissions.sh"),
        Command.workingDirectory(path.join(...TEST_BASH_SCRIPTS_PATH))
      )
      const result = yield* _(Effect.exit(Command.string(command)))
      expect(result).toEqual(Exit.fail(SystemError({
        reason: "PermissionDenied",
        module: "Command",
        method: "spawn",
        pathOrDescriptor: "./no-permissions.sh ",
        syscall: "spawn ./no-permissions.sh",
        message: "spawn ./no-permissions.sh EACCES"
      })))
    })))

  it("should throw non-existent working directory as a typed error", () =>
    runPromise(Effect.gen(function*(_) {
      const command = pipe(
        Command.make("ls"),
        Command.workingDirectory("/some/bad/path")
      )
      const result = yield* _(Effect.exit(Command.lines(command)))
      expect(result).toEqual(Exit.fail(SystemError({
        reason: "NotFound",
        module: "FileSystem",
        method: "access",
        pathOrDescriptor: "/some/bad/path",
        syscall: "access",
        message: "ENOENT: no such file or directory, access '/some/bad/path'"
      })))
    })))

  it("should be able to kill a running process", () =>
    runPromise(
      Effect.gen(function*(_) {
        const path = yield* _(Path.Path)
        const command = pipe(
          Command.make("./repeat.sh"),
          Command.workingDirectory(path.join(...TEST_BASH_SCRIPTS_PATH))
        )
        const process = yield* _(Command.start(command))
        const isRunningBeforeKill = yield* _(process.isRunning)
        yield* _(process.kill())
        const isRunningAfterKill = yield* _(process.isRunning)
        expect(isRunningBeforeKill).toBe(true)
        expect(isRunningAfterKill).toBe(false)
      }).pipe(Effect.scoped)
    ))

  it("should support piping commands together", () =>
    runPromise(Effect.gen(function*(_) {
      const command = pipe(
        Command.make("echo", "2\n1\n3"),
        Command.pipeTo(Command.make("cat")),
        Command.pipeTo(Command.make("sort"))
      )
      const result = yield* _(Command.lines(command))
      expect(result).toEqual(["1", "2", "3"])
    })))

  it("should ensure that piping commands is associative", () =>
    runPromise(Effect.gen(function*(_) {
      const command = pipe(
        Command.make("echo", "2\n1\n3"),
        Command.pipeTo(Command.make("cat")),
        Command.pipeTo(Command.make("sort")),
        Command.pipeTo(Command.make("head", "-2"))
      )
      const lines1 = yield* _(Command.lines(command))
      const lines2 = yield* _(Command.lines(command))
      expect(lines1).toEqual(["1", "2"])
      expect(lines2).toEqual(["1", "2"])
    })))

  it("should allow stdin on a piped command", () =>
    runPromise(Effect.gen(function*(_) {
      const encoder = new TextEncoder()
      const command = pipe(
        Command.make("cat"),
        Command.pipeTo(Command.make("sort")),
        Command.pipeTo(Command.make("head", "-2")),
        Command.stdin(Stream.make(encoder.encode("2\n1\n3")))
      )
      const result = yield* _(Command.lines(command))
      expect(result).toEqual(["1", "2"])
    })))

  it("should delegate env to all commands", () => {
    const env = { key: "value" }
    const command = pipe(
      Command.make("cat"),
      Command.pipeTo(Command.make("sort")),
      Command.pipeTo(Command.make("head", "-2")),
      Command.env(env)
    )
    const envs = Command.flatten(command).map((command) => Object.fromEntries(command.env))
    expect(envs).toEqual([env, env, env])
  })

  it("should delegate workingDirectory to all commands", () => {
    const workingDirectory = "working-directory"
    const command = pipe(
      Command.make("cat"),
      Command.pipeTo(Command.make("sort")),
      Command.pipeTo(Command.make("head", "-2")),
      Command.workingDirectory(workingDirectory)
    )
    const directories = Command.flatten(command).map((command) => command.cwd)
    expect(directories).toEqual([
      Option.some(workingDirectory),
      Option.some(workingDirectory),
      Option.some(workingDirectory)
    ])
  })

  it("should delegate stderr to the right-most command", () => {
    const command = pipe(
      Command.make("cat"),
      Command.pipeTo(Command.make("sort")),
      Command.pipeTo(Command.make("head", "-2")),
      Command.stderr("inherit")
    )
    const stderr = Command.flatten(command).map((command) => command.stderr)
    expect(stderr).toEqual(["pipe", "pipe", "inherit"])
  })

  it("should delegate stdout to the right-most command", () => {
    const command = pipe(
      Command.make("cat"),
      Command.pipeTo(Command.make("sort")),
      Command.pipeTo(Command.make("head", "-2")),
      Command.stdout("inherit")
    )
    const stdout = Command.flatten(command).map((command) => command.stdout)
    expect(stdout).toEqual(["pipe", "pipe", "inherit"])
  })

  it("exitCode after exit", () =>
    runPromise(
      Effect.gen(function*(_) {
        const command = Command.make("echo", "-n", "test")
        const process = yield* _(Command.start(command))
        yield* _(process.exitCode)
        const code = yield* _(process.exitCode)
        expect(code).toEqual(0)
      }).pipe(Effect.scoped)
    ))

  it("should allow running commands in a shell", () =>
    runPromise(
      Effect.gen(function*(_) {
        const files = ["foo.txt", "bar.txt", "baz.txt"]
        const path = yield* _(Path.Path)
        const fileSystem = yield* _(FileSystem.FileSystem)
        const tempDir = yield* _(fileSystem.makeTempDirectoryScoped())
        yield* _(Effect.forEach(
          files,
          (file) => fileSystem.writeFile(path.join(tempDir, file), new Uint8Array()),
          { discard: true }
        ))
        const command = Command.make("compgen", "-f").pipe(
          Command.workingDirectory(tempDir),
          Command.runInShell("/bin/bash")
        )
        const lines = yield* _(Command.lines(command))
        expect(Array.sort(files, Order.string)).toEqual(Array.sort(lines, Order.string))
      }).pipe(Effect.scoped)
    ))
})
