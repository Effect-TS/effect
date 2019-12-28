import { effect as T, freeEnv as F } from "@matechs/effect";

export const consoleEnv: unique symbol = Symbol();

export interface Console {
  [consoleEnv]: {
    /**
     * A simple assertion test that verifies whether `value` is truthy.
     * If it is not, an `AssertionError` is thrown.
     * If provided, the error `message` is formatted using `util.format()` and used as the error message.
     */
    assert(value: any, message?: string, ...optionalParams: any[]): T.Effect<T.NoEnv, T.NoErr, void>;

    /**
     * When `stdout` is a TTY, calling `console.clear()` will attempt to clear the TTY.
     * When `stdout` is not a TTY, this method does nothing.
     */
    clear: T.Effect<T.NoEnv, T.NoErr, void>;

    /**
     * Maintains an internal counter specific to `label` and outputs to `stdout` the number of times `console.count()` has been called with the given `label`.
     */
    count(label?: string): T.Effect<T.NoEnv, T.NoErr, void>;

    /**
     * Resets the internal counter specific to `label`.
     */
    countReset(label?: string): T.Effect<T.NoEnv, T.NoErr, void>;

    /**
     * The `console.debug()` function is an alias for {@link console.log()}.
     */
    debug(message?: any, ...optionalParams: any[]): T.Effect<T.NoEnv, T.NoErr, void>;

    /**
     * Uses {@link util.inspect()} on `obj` and prints the resulting string to `stdout`.
     * This function bypasses any custom `inspect()` function defined on `obj`.
     */
    dir(obj: any, options?: NodeJS.InspectOptions): T.Effect<T.NoEnv, T.NoErr, void>;

    /**
     * This method calls {@link console.log()} passing it the arguments received. Please note that this method does not produce any XML formatting
     */
    dirxml(...data: any[]): T.Effect<T.NoEnv, T.NoErr, void>;

    /**
     * Prints to `stderr` with newline.
     */
    error(message?: any, ...optionalParams: any[]): T.Effect<T.NoEnv, T.NoErr, void>;

    /**
     * Increases indentation of subsequent lines by two spaces.
     * If one or more `label`s are provided, those are printed first without the additional indentation.
     */
    group(...label: any[]): T.Effect<T.NoEnv, T.NoErr, void>;

    /**
     * The `console.groupCollapsed()` function is an alias for {@link console.group()}.
     */
    groupCollapsed(...label: any[]): T.Effect<T.NoEnv, T.NoErr, void>;

    /**
     * Decreases indentation of subsequent lines by two spaces.
     */
    groupEnd: T.Effect<T.NoEnv, T.NoErr, void>;

    /**
     * The {@link console.info()} function is an alias for {@link console.log()}.
     */
    info(message?: any, ...optionalParams: any[]): T.Effect<T.NoEnv, T.NoErr, void>;

    /**
     * Prints to `stdout` with newline.
     */
    log(message?: any, ...optionalParams: any[]): T.Effect<T.NoEnv, T.NoErr, void>;

    /**
     * This method does not display anything unless used in the inspector.
     *  Prints to `stdout` the array `array` formatted as a table.
     */
    table(tabularData: any, properties?: string[]): T.Effect<T.NoEnv, T.NoErr, void>;

    /**
     * Starts a timer that can be used to compute the duration of an operation. Timers are identified by a unique `label`.
     */
    time(label?: string): T.Effect<T.NoEnv, T.NoErr, void>;

    /**
     * Stops a timer that was previously started by calling {@link console.time()} and prints the result to `stdout`.
     */
    timeEnd(label?: string): T.Effect<T.NoEnv, T.NoErr, void>;

    /**
     * For a timer that was previously started by calling {@link console.time()}, prints the elapsed time and other `data` arguments to `stdout`.
     */

    timeLog(label?: string, ...data: any[]): T.Effect<T.NoEnv, T.NoErr, void>;

    /**
     * Prints to `stderr` the string 'Trace :', followed by the {@link util.format()} formatted message and stack trace to the current position in the code.
     */
    trace(message?: any, ...optionalParams: any[]): T.Effect<T.NoEnv, T.NoErr, void>;

    /**
     * The {@link console.warn()} function is an alias for {@link console.error()}.
     */
    warn(message?: any, ...optionalParams: any[]): T.Effect<T.NoEnv, T.NoErr, void>;
  };
}

export const consoleLive: Console = {
  [consoleEnv]: {
    assert: (v, m, ...o) => T.sync(() => console.assert(v, m, ...o)),
    clear: T.sync(() => console.clear()),
    count: l => T.sync(() => console.count(l)),
    countReset: l => T.sync(() => console.countReset(l)),
    // tslint:disable-next-line: no-console
    debug: (m, ...o) => T.sync(() => console.debug(m, ...o)),
    dir: (ob, op) => T.sync(() => console.dir(ob, op)),
    dirxml: (...d) => T.sync(() => console.dirxml(...d)),
    error: (m, ...o) => T.sync(() => console.error(m, ...o)),
    group: (...l) => T.sync(() => console.group(...l)),
    groupCollapsed: (...l) => T.sync(() => console.groupCollapsed(...l)),
    groupEnd: T.sync(() => console.groupEnd()),
    // tslint:disable-next-line: no-console
    info: (m, ...o) => T.sync(() => console.info(m, ...o)),
    log: (m, ...o) => T.sync(() => console.log(m, ...o)),
    table: (t, p) => T.sync(() => console.table(t, p)),
    // tslint:disable-next-line: no-console
    time: l => T.sync(() => console.time(l)),
    // tslint:disable-next-line: no-console
    timeEnd: l => T.sync(() => console.timeEnd(l)),
    timeLog: (l, ...d) => T.sync(() => console.timeLog(l, ...d)),
    // tslint:disable-next-line: no-console
    trace: (m, ...o) => T.sync(() => console.trace(m, ...o)),
    warn: (m, ...o) => T.sync(() => console.warn(m, ...o))
  }
};

export const {
  [consoleEnv]: {
    assert,
    time,
    clear,
    info,
    count,
    countReset,
    debug,
    dir,
    dirxml,
    error,
    group,
    groupCollapsed,
    groupEnd,
    log,
    table,
    timeEnd,
    timeLog,
    trace,
    warn
  }
} = F.access(consoleLive);
