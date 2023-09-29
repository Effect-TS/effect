import * as Command from "@effect/platform-node/Command"
import * as CommandExecutor from "@effect/platform-node/CommandExecutor"
import { SystemError } from "@effect/platform-node/Error"
import * as FileSystem from "@effect/platform-node/FileSystem"
import * as Chunk from "effect/Chunk"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Fiber from "effect/Fiber"
import { pipe } from "effect/Function"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as Stream from "effect/Stream"
import * as Path from "node:path"
import { describe, expect } from "vitest"

const TEST_BASH_SCRIPTS_DIRECTORY = Path.join(__dirname, "fixtures", "bash")

const runPromise = <E, A>(self: Effect.Effect<FileSystem.FileSystem | CommandExecutor.CommandExecutor, E, A>) =>
  Effect.runPromise(
    Effect.provide(self, Layer.provideMerge(FileSystem.layer, CommandExecutor.layer))
  )

describe("Command", () => {
  it("should convert stdout to a string", () =>
    runPromise(Effect.gen(function*($) {
      const command = Command.make("echo", "-n", "test")
      const result = yield* $(Command.string(command))
      expect(result).toEqual("test")
    })))

  it("should convert stdout to a list of lines", () =>
    runPromise(Effect.gen(function*($) {
      const command = Command.make("echo", "-n", "1\n2\n3")
      const result = yield* $(Command.lines(command))
      expect(result).toEqual(["1", "2", "3"])
    })))

  it("should stream lines of output", () =>
    runPromise(Effect.gen(function*($) {
      const command = Command.make("echo", "-n", "1\n2\n3")
      const result = yield* $(Stream.runCollect(Command.streamLines(command)))
      expect(Array.from(result)).toEqual(["1", "2", "3"])
    })))

  it("should work with a Stream directly", () =>
    runPromise(Effect.gen(function*($) {
      const decoder = new TextDecoder("utf-8")
      const command = Command.make("echo", "-n", "1\n2\n3")
      const result = yield* $(
        Command.stream(command),
        Stream.mapChunks(Chunk.map((bytes) => decoder.decode(bytes))),
        Stream.splitLines,
        Stream.runCollect
      )
      expect(Array.from(result)).toEqual(["1", "2", "3"])
    })))

  it("should fail when trying to run a command that does not exist", () =>
    runPromise(Effect.gen(function*($) {
      const command = Command.make("some-invalid-command", "test")
      const result = yield* $(Effect.exit(Command.string(command)))
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
    runPromise(Effect.gen(function*($) {
      const command = pipe(
        Command.make("bash", "-c", "echo -n \"var = $VAR\""),
        Command.env({ VAR: "myValue" })
      )
      const result = yield* $(Command.string(command))
      expect(result).toBe("var = myValue")
    })))

  it("should accept streaming stdin", () =>
    runPromise(Effect.gen(function*($) {
      const stdin = Stream.make(Buffer.from("a b c", "utf-8"))
      const command = pipe(Command.make("cat"), Command.stdin(stdin))
      const result = yield* $(Command.string(command))
      expect(result).toEqual("a b c")
    })))

  it("should accept string stdin", () =>
    runPromise(Effect.gen(function*($) {
      const stdin = "piped in"
      const command = pipe(Command.make("cat"), Command.feed(stdin))
      const result = yield* $(Command.string(command))
      expect(result).toEqual("piped in")
    })))

  it("should set the working directory", () =>
    runPromise(Effect.gen(function*($) {
      const command = pipe(
        Command.make("ls"),
        Command.workingDirectory(Path.join(__dirname, "..", "src"))
      )
      const result = yield* $(Command.lines(command))
      expect(result).toContain("Command.ts")
    })))

  it("should be able to fall back to a different program", () =>
    runPromise(Effect.gen(function*($) {
      const command = Command.make("custom-echo", "-n", "test")
      const result = yield* $(
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
    runPromise(Effect.gen(function*($) {
      const command = Command.make("sleep", "20")
      const result = yield* $(
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
  //   runPromise(Effect.gen(function*($) {
  //     const command = pipe(
  //       Command.make("./duplex.sh"),
  //       Command.workingDirectory(TEST_BASH_SCRIPTS_DIRECTORY)
  //     )
  //     const process = yield* $(Command.start(command))
  //     const result = yield* $(pipe(
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
    runPromise(Effect.gen(function*($) {
      const command = pipe(
        Command.make("./non-zero-exit.sh"),
        Command.workingDirectory(TEST_BASH_SCRIPTS_DIRECTORY)
      )
      const result = yield* $(Command.exitCode(command))
      expect(result).toBe(1)
    })))

  it("should throw permission denied as a typed error", () =>
    runPromise(Effect.gen(function*($) {
      const command = pipe(
        Command.make("./no-permissions.sh"),
        Command.workingDirectory(TEST_BASH_SCRIPTS_DIRECTORY)
      )
      const result = yield* $(Effect.exit(Command.string(command)))
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
    runPromise(Effect.gen(function*($) {
      const command = pipe(
        Command.make("ls"),
        Command.workingDirectory("/some/bad/path")
      )
      const result = yield* $(Effect.exit(Command.lines(command)))
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
    runPromise(Effect.gen(function*($) {
      const command = pipe(
        Command.make("./repeat.sh"),
        Command.workingDirectory(TEST_BASH_SCRIPTS_DIRECTORY)
      )
      const process = yield* $(Command.start(command))
      const isRunningBeforeKill = yield* $(process.isRunning)
      yield* $(process.kill())
      const isRunningAfterKill = yield* $(process.isRunning)
      expect(isRunningBeforeKill).toBe(true)
      expect(isRunningAfterKill).toBe(false)
    })))

  it("should support piping commands together", () =>
    runPromise(Effect.gen(function*($) {
      const command = pipe(
        Command.make("echo", "2\n1\n3"),
        Command.pipeTo(Command.make("cat")),
        Command.pipeTo(Command.make("sort"))
      )
      const result = yield* $(Command.lines(command))
      expect(result).toEqual(["1", "2", "3"])
    })))

  it("should ensure that piping commands is associative", () =>
    runPromise(Effect.gen(function*($) {
      const command = pipe(
        Command.make("echo", "2\n1\n3"),
        Command.pipeTo(Command.make("cat")),
        Command.pipeTo(Command.make("sort")),
        Command.pipeTo(Command.make("head", "-2"))
      )
      const lines1 = yield* $(Command.lines(command))
      const lines2 = yield* $(Command.lines(command))
      expect(lines1).toEqual(["1", "2"])
      expect(lines2).toEqual(["1", "2"])
    })))

  it("should allow stdin on a piped command", () =>
    runPromise(Effect.gen(function*($) {
      const encoder = new TextEncoder()
      const command = pipe(
        Command.make("cat"),
        Command.pipeTo(Command.make("sort")),
        Command.pipeTo(Command.make("head", "-2")),
        Command.stdin(Stream.make(encoder.encode("2\n1\n3")))
      )
      const result = yield* $(Command.lines(command))
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
    runPromise(Effect.gen(function*($) {
      const command = Command.make("echo", "-n", "test")
      const process = yield* $(Command.start(command))
      yield* $(process.exitCode)
      const code = yield* $(process.exitCode)
      expect(code).toEqual(0)
    })))
})
