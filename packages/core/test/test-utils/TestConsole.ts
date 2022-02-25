import type { Array } from "../../src/collection/immutable/Array"
import * as A from "../../src/collection/immutable/Array"
import { List } from "../../src/collection/immutable/List"
import type { Has } from "../../src/data/Has"
import { tag } from "../../src/data/Has"
import type { IO, RIO, UIO } from "../../src/io/Effect"
import { Effect } from "../../src/io/Effect"
import * as Ref from "../../src/io/Ref"

// TODO(Mike/Max): move this to `@effect-ts/test`
export const TestConsoleId = Symbol.for("@effect-ts/core/test/TestConsole")
export type TestConsoleId = typeof TestConsoleId

export interface TestConsole {
  /**
   * Writes the specified string to the output buffer.
   */
  readonly print: (line: any, __etsTrace?: string) => IO<TestConsoleError, void>
  /**
   * Writes the specified string to the error buffer.
   */
  readonly printError: (line: any, __etsTrace?: string) => IO<TestConsoleError, void>
  /**
   * Writes the specified string to the output buffer followed by a newline
   * character.
   */
  readonly printLine: (line: any, __etsTrace?: string) => IO<TestConsoleError, void>
  /**
   * Writes the specified string to the error buffer followed by a newline
   * character.
   */
  readonly printLineError: (
    line: any,
    __etsTrace?: string
  ) => IO<TestConsoleError, void>
  /**
   * Takes the first value from the input buffer, if one exists, or else fails
   * with an `EOFException`.
   */
  readonly readLine: (__etsTrace?: string) => IO<TestConsoleError, void>
  /**
   * Writes the specified sequence of strings to the input buffer. The first
   * string in the sequence will be the first to be taken. These strings will
   * be taken before any strings that were previously in the input buffer.
   */
  readonly feedLines: (lines: Array<string>, __etsTrace?: string) => UIO<void>
  /**
   * Takes the first value from the input buffer, if one exists, or else fails
   * with an `EOFException`.
   */
  readonly output: (__etsTrace?: string) => UIO<Array<string>>
  /**
   * Returns the contents of the error output buffer. The first value written
   * to the error output buffer will be the first in the sequence.
   */
  readonly outputError: (__etsTrace?: string) => UIO<void>
  /**
   * Clears the contents of the input buffer.
   */
  readonly clearInput: (__etsTrace?: string) => UIO<void>
  /**
   * Clears the contents of the output buffer.
   */
  readonly clearOutput: (__etsTrace?: string) => UIO<void>
  // /**
  //  * Runs the specified effect with the `TestConsole` set to silent mode, so
  //  * that console output is only written to the output buffer and not rendered
  //  * to standard output.
  //  */
  // readonly silent: <R, E, A>(
  //   effect: Effect<R, E, A>,
  //   __etsTrace?: string
  // ) => Effect<R, E, A>
  // /**
  //  * Runs the specified effect with the `TestConsole` set to debug mode, so
  //  * that console output is rendered to standard output in addition to being
  //  * written to the output buffer.
  //  */
  // readonly debug: <R, E, A>(
  //   effect: Effect<R, E, A>,
  //   __etsTrace?: string
  // ) => Effect<R, E, A>
  /**
   * Saves the `TestConsole`'s current state in an effect which, when run,
   * will restore the `TestConsole` state to the saved state.
   */
  readonly save: (__etsTrace?: string) => UIO<UIO<void>>
}

export const TestConsole = tag<TestConsole>(TestConsoleId)

export type HasTestConsole = Has<TestConsole>

export class TestConsoleError {
  constructor(readonly message: string) {}
}

/**
 * The state of the `TestConsole`.
 */
export interface TestConsoleState {
  readonly input: List<string>
  readonly output: Array<string>
  readonly outputError: Array<string>
}

export function makeTestConsole(
  consoleState: Ref.Ref<TestConsoleState>,
  debugState: boolean
): TestConsole {
  return {
    print: (line) =>
      Ref.update_(consoleState, (state) => ({
        ...state,
        output: A.append_(state.output, String(line))
      })),
    printError: (line) =>
      Ref.update_(consoleState, (state) => ({
        ...state,
        outputError: A.append_(state.outputError, String(line))
      })),
    printLine: (line) =>
      Ref.update_(consoleState, (state) => ({
        ...state,
        output: A.append_(state.output, String(line) + "\n")
      })),
    printLineError: (line) =>
      Ref.update_(consoleState, (state) => ({
        ...state,
        outputError: A.append_(state.outputError, String(line) + "\n")
      })),
    readLine: () =>
      Ref.get(consoleState).flatMap((state) =>
        Effect.fromOption(state.input.first).orElseFail(
          new TestConsoleError("There is no more input left to read")
        )
      ),
    feedLines: (lines) =>
      Ref.update_(consoleState, (state) => ({
        ...state,
        input: List.from(lines) + state.input
      })),
    output: () => Ref.get(consoleState).map((state) => state.output),
    outputError: () => Ref.get(consoleState).map((state) => state.outputError),
    clearInput: () =>
      Ref.update_(consoleState, (state) => ({ ...state, input: List.empty<string>() })),
    clearOutput: () =>
      Ref.update_(consoleState, (state) => ({ ...state, output: A.empty<string>() })),
    save: () => Ref.get(consoleState).map((state) => Ref.set_(consoleState, state))
  }
}

/**
 * Writes the specified string to the output buffer.
 */
export function print(
  line: any,
  __etsTrace?: string
): Effect<HasTestConsole, TestConsoleError, void> {
  return Effect.serviceWithEffect(TestConsole)((_) => _.print(line))
}

/**
 * Writes the specified string to the error buffer.
 */
export function printError(
  line: any,
  __etsTrace?: string
): Effect<HasTestConsole, TestConsoleError, void> {
  return Effect.serviceWithEffect(TestConsole)((_) => _.printError(line))
}

/**
 * Writes the specified string to the output buffer followed by a newline
 * character.
 */
export function printLine(
  line: any,
  __etsTrace?: string
): Effect<HasTestConsole, TestConsoleError, void> {
  return Effect.serviceWithEffect(TestConsole)((_) => _.printLine(line))
}

/**
 * Writes the specified string to the error buffer followed by a newline
 * character.
 */
export function printLineError(
  line: any,
  __etsTrace?: string
): Effect<HasTestConsole, TestConsoleError, void> {
  return Effect.serviceWithEffect(TestConsole)((_) => _.printLineError(line))
}

/**
 * Takes the first value from the input buffer, if one exists, or else fails
 * with an `EOFException`.
 */
export function readLine(
  __etsTrace?: string
): Effect<HasTestConsole, TestConsoleError, void> {
  return Effect.serviceWithEffect(TestConsole)((_) => _.readLine())
}

/**
 * Writes the specified sequence of strings to the input buffer. The first
 * string in the sequence will be the first to be taken. These strings will
 * be taken before any strings that were previously in the input buffer.
 */
export function feedLines(
  lines: Array<string>,
  __etsTrace?: string
): RIO<HasTestConsole, void> {
  return Effect.serviceWithEffect(TestConsole)((_) => _.feedLines(lines))
}

/**
 * Takes the first value from the input buffer, if one exists, or else fails
 * with an `EOFException`.
 */
export function output(__etsTrace?: string): RIO<HasTestConsole, Array<string>> {
  return Effect.serviceWithEffect(TestConsole)((_) => _.output())
}

/**
 * Returns the contents of the error output buffer. The first value written
 * to the error output buffer will be the first in the sequence.
 */
export function outputError(__etsTrace?: string): RIO<HasTestConsole, void> {
  return Effect.serviceWithEffect(TestConsole)((_) => _.outputError())
}

/**
 * Clears the contents of the input buffer.
 */
export function clearInput(__etsTrace?: string): RIO<HasTestConsole, void> {
  return Effect.serviceWithEffect(TestConsole)((_) => _.clearInput())
}

/**
 * Clears the contents of the output buffer.
 */
export function clearOutput(__etsTrace?: string): RIO<HasTestConsole, void> {
  return Effect.serviceWithEffect(TestConsole)((_) => _.clearOutput())
}
