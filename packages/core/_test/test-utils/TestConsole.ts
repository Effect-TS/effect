// TODO(Mike/Max): move this to `@effect/test`
export interface TestConsole {
  /**
   * Writes the specified string to the output buffer.
   */
  readonly print: (line: any, __tsplusTrace?: string) => Effect<never, TestConsoleError, void>
  /**
   * Writes the specified string to the error buffer.
   */
  readonly printError: (line: any, __tsplusTrace?: string) => Effect<never, TestConsoleError, void>
  /**
   * Writes the specified string to the output buffer followed by a newline
   * character.
   */
  readonly printLine: (line: any, __tsplusTrace?: string) => Effect<never, TestConsoleError, void>
  /**
   * Writes the specified string to the error buffer followed by a newline
   * character.
   */
  readonly printLineError: (
    line: any,
    __tsplusTrace?: string
  ) => Effect<never, TestConsoleError, void>
  /**
   * Takes the first value from the input buffer, if one exists, or else fails
   * with an `EOFException`.
   */
  readonly readLine: (__tsplusTrace?: string) => Effect<never, TestConsoleError, void>
  /**
   * Writes the specified sequence of strings to the input buffer. The first
   * string in the sequence will be the first to be taken. These strings will
   * be taken before any strings that were previously in the input buffer.
   */
  readonly feedLines: (lines: ImmutableArray<string>, __tsplusTrace?: string) => Effect.UIO<void>
  /**
   * Takes the first value from the input buffer, if one exists, or else fails
   * with an `EOFException`.
   */
  readonly output: (__tsplusTrace?: string) => Effect.UIO<ImmutableArray<string>>
  /**
   * Returns the contents of the error output buffer. The first value written
   * to the error output buffer will be the first in the sequence.
   */
  readonly outputError: (__tsplusTrace?: string) => Effect.UIO<void>
  /**
   * Clears the contents of the input buffer.
   */
  readonly clearInput: (__tsplusTrace?: string) => Effect.UIO<void>
  /**
   * Clears the contents of the output buffer.
   */
  readonly clearOutput: (__tsplusTrace?: string) => Effect.UIO<void>
  // /**
  //  * Runs the specified effect with the `TestConsole` set to silent mode, so
  //  * that console output is only written to the output buffer and not rendered
  //  * to standard output.
  //  */
  // readonly silent: <R, E, A>(
  //   effect: Effect<R, E, A>,
  //   __tsplusTrace?: string
  // ) => Effect<R, E, A>
  // /**
  //  * Runs the specified effect with the `TestConsole` set to debug mode, so
  //  * that console output is rendered to standard output in addition to being
  //  * written to the output buffer.
  //  */
  // readonly debug: <R, E, A>(
  //   effect: Effect<R, E, A>,
  //   __tsplusTrace?: string
  // ) => Effect<R, E, A>
  /**
   * Saves the `TestConsole`'s current state in an effect which, when run,
   * will restore the `TestConsole` state to the saved state.
   */
  readonly save: (__tsplusTrace?: string) => Effect.UIO<Effect.UIO<void>>
}

/**
 * @tsplus type effect/core/test/TestConsole.Ops
 */
export interface TestConsoleOps {
  readonly Tag: Tag<TestConsole>
}
export const TestConsole: TestConsoleOps = {
  Tag: Tag<TestConsole>()
}

export class TestConsoleError {
  constructor(readonly message: string) {}
}

/**
 * The state of the `TestConsole`.
 */
export interface TestConsoleState {
  readonly input: List<string>
  readonly output: ImmutableArray<string>
  readonly outputError: ImmutableArray<string>
}

export function makeTestConsole(
  consoleState: Ref<TestConsoleState>,
  debugState: boolean
): TestConsole {
  return {
    print: (line) =>
      consoleState.update((state) => ({
        ...state,
        output: state.output.append(String(line))
      })),
    printError: (line) =>
      consoleState.update((state) => ({
        ...state,
        outputError: state.outputError.append(String(line))
      })),
    printLine: (line) =>
      consoleState.update((state) => ({
        ...state,
        output: state.output.append(String(line) + "\n")
      })),
    printLineError: (line) =>
      consoleState.update((state) => ({
        ...state,
        outputError: state.outputError.append(String(line) + "\n")
      })),
    readLine: () =>
      consoleState
        .get()
        .flatMap((state) =>
          Effect.fromMaybe(state.input.head).orElseFail(
            new TestConsoleError("There is no more input left to read")
          )
        ),
    feedLines: (lines) =>
      consoleState.update((state) => ({
        ...state,
        input: List.from(lines) + state.input
      })),
    output: () => consoleState.get().map((state) => state.output),
    outputError: () => consoleState.get().map((state) => state.outputError),
    clearInput: () => consoleState.update((state) => ({ ...state, input: List.empty<string>() })),
    clearOutput: () =>
      consoleState.update((state) => ({ ...state, output: ImmutableArray.empty<string>() })),
    save: () => consoleState.get().map((state) => consoleState.set(state))
  }
}

/**
 * Writes the specified string to the output buffer.
 */
export function print(
  line: any,
  __tsplusTrace?: string
): Effect<TestConsole, TestConsoleError, void> {
  return Effect.serviceWithEffect(TestConsole.Tag, (_) => _.print(line))
}

/**
 * Writes the specified string to the error buffer.
 */
export function printError(
  line: any,
  __tsplusTrace?: string
): Effect<TestConsole, TestConsoleError, void> {
  return Effect.serviceWithEffect(TestConsole.Tag, (_) => _.printError(line))
}

/**
 * Writes the specified string to the output buffer followed by a newline
 * character.
 */
export function printLine(
  line: any,
  __tsplusTrace?: string
): Effect<TestConsole, TestConsoleError, void> {
  return Effect.serviceWithEffect(TestConsole.Tag, (_) => _.printLine(line))
}

/**
 * Writes the specified string to the error buffer followed by a newline
 * character.
 */
export function printLineError(
  line: any,
  __tsplusTrace?: string
): Effect<TestConsole, TestConsoleError, void> {
  return Effect.serviceWithEffect(TestConsole.Tag, (_) => _.printLineError(line))
}

/**
 * Takes the first value from the input buffer, if one exists, or else fails
 * with an `EOFException`.
 */
export function readLine(
  __tsplusTrace?: string
): Effect<TestConsole, TestConsoleError, void> {
  return Effect.serviceWithEffect(TestConsole.Tag, (_) => _.readLine())
}

/**
 * Writes the specified sequence of strings to the input buffer. The first
 * string in the sequence will be the first to be taken. These strings will
 * be taken before any strings that were previously in the input buffer.
 */
export function feedLines(
  lines: ImmutableArray<string>,
  __tsplusTrace?: string
): Effect.RIO<TestConsole, void> {
  return Effect.serviceWithEffect(TestConsole.Tag, (_) => _.feedLines(lines))
}

/**
 * Takes the first value from the input buffer, if one exists, or else fails
 * with an `EOFException`.
 */
export function output(__tsplusTrace?: string): Effect.RIO<TestConsole, ImmutableArray<string>> {
  return Effect.serviceWithEffect(TestConsole.Tag, (_) => _.output())
}

/**
 * Returns the contents of the error output buffer. The first value written
 * to the error output buffer will be the first in the sequence.
 */
export function outputError(__tsplusTrace?: string): Effect.RIO<TestConsole, void> {
  return Effect.serviceWithEffect(TestConsole.Tag, (_) => _.outputError())
}

/**
 * Clears the contents of the input buffer.
 */
export function clearInput(__tsplusTrace?: string): Effect.RIO<TestConsole, void> {
  return Effect.serviceWithEffect(TestConsole.Tag, (_) => _.clearInput())
}

/**
 * Clears the contents of the output buffer.
 */
export function clearOutput(__tsplusTrace?: string): Effect.RIO<TestConsole, void> {
  return Effect.serviceWithEffect(TestConsole.Tag, (_) => _.clearOutput())
}
