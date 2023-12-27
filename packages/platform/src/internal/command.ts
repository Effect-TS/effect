import * as Chunk from "effect/Chunk"
import * as Effect from "effect/Effect"
import { dual } from "effect/Function"
import * as HashMap from "effect/HashMap"
import * as Option from "effect/Option"
import { pipeArguments } from "effect/Pipeable"
import type * as ReadonlyArray from "effect/ReadonlyArray"
import type { Scope } from "effect/Scope"
import * as Stream from "effect/Stream"
import type * as Command from "../Command.js"
import type * as CommandExecutor from "../CommandExecutor.js"
import type { PlatformError } from "../Error.js"
import * as commandExecutor from "./commandExecutor.js"

/** @internal */
export const CommandTypeId: Command.CommandTypeId = Symbol.for("@effect/platform/Command") as Command.CommandTypeId

/** @internal */
export const isCommand = (u: unknown): u is Command.Command => typeof u === "object" && u != null && CommandTypeId in u

/** @internal */
export const env: {
  (environment: Record<string, string>): (self: Command.Command) => Command.Command
  (self: Command.Command, environment: Record<string, string>): Command.Command
} = dual<
  (environment: Record<string, string>) => (self: Command.Command) => Command.Command,
  (self: Command.Command, environment: Record<string, string>) => Command.Command
>(2, (self, environment) => {
  switch (self._tag) {
    case "StandardCommand": {
      return { ...self, env: HashMap.union(self.env, HashMap.fromIterable(Object.entries(environment))) }
    }
    case "PipedCommand": {
      return pipeTo(env(self.left, environment), env(self.right, environment))
    }
  }
})

/** @internal */
export const exitCode = (
  self: Command.Command
): Effect.Effect<CommandExecutor.CommandExecutor, PlatformError, CommandExecutor.ExitCode> =>
  Effect.flatMap(commandExecutor.CommandExecutor, (executor) => executor.exitCode(self))

/** @internal */
export const feed = dual<
  (input: string) => (self: Command.Command) => Command.Command,
  (self: Command.Command, input: string) => Command.Command
>(2, (self, input) => stdin(self, Stream.fromChunk(Chunk.of(new TextEncoder().encode(input)))))

/** @internal */
export const flatten = (self: Command.Command): ReadonlyArray.NonEmptyReadonlyArray<Command.StandardCommand> =>
  Array.from(flattenLoop(self)) as unknown as ReadonlyArray.NonEmptyReadonlyArray<
    Command.StandardCommand
  >

/** @internal */
const flattenLoop = (self: Command.Command): Chunk.NonEmptyChunk<Command.StandardCommand> => {
  switch (self._tag) {
    case "StandardCommand": {
      return Chunk.of(self)
    }
    case "PipedCommand": {
      return Chunk.appendAll(
        flattenLoop(self.left),
        flattenLoop(self.right)
      ) as Chunk.NonEmptyChunk<Command.StandardCommand>
    }
  }
}

/** @internal */
export const runInShell = dual<
  (shell: boolean | string) => (self: Command.Command) => Command.Command,
  (self: Command.Command, shell: boolean | string) => Command.Command
>(2, (self: Command.Command, shell: boolean | string): Command.Command => {
  switch (self._tag) {
    case "StandardCommand": {
      return { ...self, shell }
    }
    case "PipedCommand": {
      return pipeTo(
        runInShell(self.left, shell),
        runInShell(self.right, shell)
      )
    }
  }
})

/** @internal */
export const lines = (
  command: Command.Command,
  encoding = "utf-8"
): Effect.Effect<CommandExecutor.CommandExecutor, PlatformError, ReadonlyArray<string>> =>
  Effect.flatMap(commandExecutor.CommandExecutor, (executor) => executor.lines(command, encoding))

/** @internal */
export const make = (command: string, ...args: Array<string>): Command.Command => ({
  [CommandTypeId]: CommandTypeId,
  _tag: "StandardCommand",
  command,
  args,
  env: HashMap.empty(),
  cwd: Option.none(),
  shell: false,
  // The initial process input here does not matter, we just want the child
  // process to default to `"pipe"` for the stdin stream.
  stdin: Option.some(Stream.empty),
  stdout: "pipe",
  stderr: "pipe",
  gid: Option.none(),
  uid: Option.none(),
  pipe() {
    return pipeArguments(this, arguments)
  }
})

/** @internal */
export const pipeTo = dual<
  (into: Command.Command) => (self: Command.Command) => Command.Command,
  (self: Command.Command, into: Command.Command) => Command.Command
>(2, (self, into) => ({
  [CommandTypeId]: CommandTypeId,
  _tag: "PipedCommand",
  left: self,
  right: into,
  pipe() {
    return pipeArguments(this, arguments)
  }
}))

/** @internal */
export const stderr: {
  (stderr: Command.Command.Output): (self: Command.Command) => Command.Command
  (self: Command.Command, stderr: Command.Command.Output): Command.Command
} = dual<
  (stderr: Command.Command.Output) => (self: Command.Command) => Command.Command,
  (self: Command.Command, stderr: Command.Command.Output) => Command.Command
>(2, (self, output) => {
  switch (self._tag) {
    case "StandardCommand": {
      return { ...self, stderr: output }
    }
    // For piped commands it only makes sense to provide `stderr` for the
    // right-most command as the rest will be piped in.
    case "PipedCommand": {
      return { ...self, right: stderr(self.right, output) }
    }
  }
})

/** @internal */
export const stdin: {
  (stdin: Command.Command.Input): (self: Command.Command) => Command.Command
  (self: Command.Command, stdin: Command.Command.Input): Command.Command
} = dual<
  (stdin: Command.Command.Input) => (self: Command.Command) => Command.Command,
  (self: Command.Command, stdin: Command.Command.Input) => Command.Command
>(2, (self, input) => {
  switch (self._tag) {
    case "StandardCommand": {
      return { ...self, stdin: Option.some(input) }
    }
    // For piped commands it only makes sense to provide `stdin` for the
    // left-most command as the rest will be piped in.
    case "PipedCommand": {
      return { ...self, left: stdin(self.left, input) }
    }
  }
})

/** @internal */
export const stdout: {
  (stdout: Command.Command.Output): (self: Command.Command) => Command.Command
  (self: Command.Command, stdout: Command.Command.Output): Command.Command
} = dual<
  (stdout: Command.Command.Output) => (self: Command.Command) => Command.Command,
  (self: Command.Command, stdout: Command.Command.Output) => Command.Command
>(2, (self, output) => {
  switch (self._tag) {
    case "StandardCommand": {
      return { ...self, stdout: output }
    }
    // For piped commands it only makes sense to provide `stderr` for the
    // right-most command as the rest will be piped in.
    case "PipedCommand": {
      return { ...self, right: stdout(self.right, output) }
    }
  }
})

/** @internal */
export const start = (
  command: Command.Command
): Effect.Effect<CommandExecutor.CommandExecutor | Scope, PlatformError, CommandExecutor.Process> =>
  Effect.flatMap(commandExecutor.CommandExecutor, (executor) => executor.start(command))

/** @internal */
export const stream = (
  command: Command.Command
): Stream.Stream<CommandExecutor.CommandExecutor, PlatformError, Uint8Array> =>
  Stream.flatMap(commandExecutor.CommandExecutor, (process) => process.stream(command))

/** @internal */
export const streamLines = (
  command: Command.Command
): Stream.Stream<CommandExecutor.CommandExecutor, PlatformError, string> =>
  Stream.flatMap(commandExecutor.CommandExecutor, (process) => process.streamLines(command))

/** @internal */
export const string = dual<
  (
    encoding?: string
  ) => (command: Command.Command) => Effect.Effect<CommandExecutor.CommandExecutor, PlatformError, string>,
  (command: Command.Command, encoding?: string) => Effect.Effect<CommandExecutor.CommandExecutor, PlatformError, string>
>(
  (args) => isCommand(args[0]),
  (command, encoding) =>
    Effect.flatMap(commandExecutor.CommandExecutor, (executor) => executor.string(command, encoding))
)

/** @internal */
export const workingDirectory: {
  (cwd: string): (self: Command.Command) => Command.Command
  (self: Command.Command, cwd: string): Command.Command
} = dual<
  (cwd: string) => (self: Command.Command) => Command.Command,
  (self: Command.Command, cwd: string) => Command.Command
>(2, (self, cwd) => {
  switch (self._tag) {
    case "StandardCommand": {
      return { ...self, cwd: Option.some(cwd) }
    }
    case "PipedCommand": {
      return pipeTo(workingDirectory(self.left, cwd), workingDirectory(self.right, cwd))
    }
  }
})
