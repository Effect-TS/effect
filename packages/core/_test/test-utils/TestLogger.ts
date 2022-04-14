// TODO(Mike/Max): move this to `@effect/test`
export const TestLoggerId = Symbol.for("@effect/core/test/TestLogger");
export type TestLoggerId = typeof TestLoggerId;

/**
 * A `TestLogger` is an implementation of a `Logger` that writes all log
 * messages to an internal data structure. The contents of this data structure
 * can be accessed using the `logOutput` operator. This makes it easy to write
 * tests to verify that expected messages are being logged.
 *
 * @tsplus type ets/TestLogger
 */
export interface TestLogger<Message, Output> extends Logger<Message, Output> {
  readonly [TestLoggerId]: TestLoggerId;
  readonly logOutput: UIO<ImmutableArray<LogEntry>>;
}

/**
 * @tsplus type ets/TestLogger/Ops
 */
export interface TestLoggerOps {
  Tag: Service.Tag<TestLogger<string, void>>;
}
export const TestLogger: TestLoggerOps = {
  Tag: Tag<TestLogger<string, void>>()
};

/**
 * @tsplus unify ets/Logger
 */
export function unifyLogger<X extends TestLogger<any, any>>(
  self: X
): TestLogger<
  [X] extends [TestLogger<infer MX, any>] ? MX : never,
  [X] extends [TestLogger<any, infer OX>] ? OX : never
> {
  return self;
}

/**
 * @tsplus static ets/TestLogger/Ops isTestLogger
 */
export function isTestLogger(u: unknown): u is TestLogger<unknown, unknown> {
  return typeof u === "object" && u != null && TestLoggerId in u;
}

/**
 * A log entry captures all of the contents of a log message as a data
 * structure.
 */
export class LogEntry {
  constructor(
    readonly trace: TraceElement,
    readonly fiberId: FiberId,
    readonly logLevel: LogLevel,
    readonly message: Lazy<string>,
    readonly cause: Lazy<Cause<any>>,
    readonly context: Map<FiberRef<unknown>, unknown>,
    readonly spans: List<LogSpan>,
    readonly annotations: Map<string, string>
  ) {}

  call<A>(logger: Logger<string, A>): A {
    return logger.apply(
      this.trace,
      this.fiberId,
      this.logLevel,
      this.message,
      this.cause,
      this.context,
      this.spans,
      this.annotations
    );
  }
}

/**
 * @tsplus static ets/TestLogger/Ops make
 */
export const makeTestLogger: UIO<TestLogger<string, void>> = Effect.succeed(() => {
  const logOutput = new AtomicReference<ImmutableArray<LogEntry>>(ImmutableArray.empty());
  return {
    [TestLoggerId]: TestLoggerId,
    apply: (
      trace,
      fiberId,
      logLevel,
      message,
      cause,
      context,
      spans,
      annotations
    ): void => {
      const oldState = logOutput.get;
      logOutput.set(
        oldState.append(
          new LogEntry(
            trace,
            fiberId,
            logLevel,
            message,
            cause,
            context,
            spans,
            annotations
          )
        )
      );
    },
    logOutput: Effect.succeed(logOutput.get)
  };
});

/**
 * A layer which constructs a new `TestLogger` and runs the effect it is
 * provided to with the `RuntimeConfig` updated to add the `TestLogger`.
 *
 * @tsplus static ets/TestLogger/Ops default
 */
export const defaultTestLogger: Layer<unknown, never, Has<TestLogger<string, void>>> = Layer.scoped(TestLogger.Tag)(
  Effect.Do()
    .bind("runtimeConfig", () => Effect.runtimeConfig)
    .bind("testLogger", () => makeTestLogger)
    .bindValue("acquire", ({ runtimeConfig, testLogger }) =>
      Effect.setRuntimeConfig(
        runtimeConfig.copy({ loggers: HashSet(testLogger) })
      ))
    .bindValue("release", ({ runtimeConfig }) => Effect.setRuntimeConfig(runtimeConfig))
    .tap(({ acquire, release }) => Effect.acquireRelease(acquire, () => release))
    .map(({ testLogger }) => testLogger)
);

/**
 * Accesses the contents of the current test logger.
 *
 * @tsplus static ets/TestLogger/Ops logOutput
 */
export const logOutput: UIO<ImmutableArray<LogEntry>> = Effect.runtimeConfig.flatMap(
  (runtimeConfig) =>
    runtimeConfig.value.loggers.asList().head().flatMap((logger) =>
      isTestLogger(logger) ? Option.some(logger.logOutput) : Option.none
    ).getOrElse(Effect.dieMessage("Defect: TestLogger is missing"))
);
