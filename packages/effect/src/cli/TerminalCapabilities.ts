/**
 * Opt-in detection of whether a CLI can color, animate, or prompt.
 *
 * The detecting layer reads `NO_COLOR`, `FORCE_COLOR`, and `TERM` through
 * `ConfigProvider`, plus the TTY state of `Stdio`. When the service is
 * installed and no `CliOutput.Formatter` is provided, the built-in help,
 * version, and error output of `Command` follows `canColor`. CLIs that never
 * install the layer keep the existing formatter behavior.
 *
 * @stability unstable
 * @since 4.0.0
 */
import * as Config from "../Config.ts"
import * as Context from "../Context.ts"
import * as Effect from "../Effect.ts"
import * as Layer from "../Layer.ts"
import * as Option from "../Option.ts"
import * as Stdio from "../Stdio.ts"

/**
 * Service tag for terminal capability detection.
 *
 * **When to use**
 *
 * Use when a CLI should detect its terminal from the environment and `Stdio`,
 * and when application output should share that answer with the built-in
 * help, version, and error output. Leave it out and `CliOutput` keeps its
 * built-in TTY check.
 *
 * **Details**
 *
 * `canColor` says whether styling will be rendered rather than stored as
 * bytes. `canAnimate` says whether output is being watched, so pacing means
 * something. `canPrompt` says whether a question can be asked and answered.
 * Only `canColor` is read by the built-in `Command` output; the other two are
 * for application code that renders its own output.
 *
 * @stability unstable
 * @category services
 * @since 4.0.0
 */
export class TerminalCapabilities extends Context.Service<TerminalCapabilities, {
  readonly canColor: boolean
  readonly canAnimate: boolean
  readonly canPrompt: boolean
}>()("effect/cli/TerminalCapabilities") {}

const isPresent = (value: string | undefined): value is string => value !== undefined && value.length > 0

const isForcingColor = (value: string | undefined): boolean =>
  isPresent(value) && value !== "0" && value.toLowerCase() !== "false"

const detect = (input: {
  readonly noColor: string | undefined
  readonly forceColor: string | undefined
  readonly term: string | undefined
  readonly stdinIsTerminal: boolean
  readonly stdoutIsTerminal: boolean
}): TerminalCapabilities["Service"] => {
  if (input.term === "dumb") {
    return { canColor: false, canAnimate: false, canPrompt: false }
  }

  return {
    canColor: !isPresent(input.noColor) && (isForcingColor(input.forceColor) || input.stdoutIsTerminal),
    canAnimate: input.stdoutIsTerminal,
    canPrompt: input.stdinIsTerminal && input.stdoutIsTerminal
  }
}

const environment = Config.all({
  noColor: Config.option(Config.String("NO_COLOR")),
  forceColor: Config.option(Config.String("FORCE_COLOR")),
  term: Config.option(Config.String("TERM"))
})

/**
 * Detects terminal capabilities from `Stdio` and the current `ConfigProvider`.
 *
 * **Details**
 *
 * `TERM=dumb` clears all three flags, because a terminal that cannot move the
 * cursor can neither animate nor redraw a prompt. Otherwise `NO_COLOR`, when
 * set to any non-empty value, disables color and wins over `FORCE_COLOR`.
 * `FORCE_COLOR` forces color even off a TTY, except for `0` and `false`, which
 * mean "not forcing". Empty variables count as unset, matching
 * `ConfigProvider.fromEnv`, so `FORCE_COLOR=` does not force color on.
 * `canPrompt` requires both standard input and standard output to be
 * terminals. A `ConfigProvider` fault is a defect, so the layer never fails.
 *
 * **Example** (NO_COLOR wins over FORCE_COLOR)
 *
 * ```ts import.meta.vitest
 * import { ConfigProvider, Effect, Stdio } from "effect"
 * import { TerminalCapabilities } from "effect/cli"
 *
 * const program = Effect.gen(function*() {
 *   const caps = yield* TerminalCapabilities.TerminalCapabilities
 *   return caps.canColor
 * }).pipe(
 *   Effect.provide(TerminalCapabilities.layer),
 *   Effect.provide(Stdio.layerTest({ stdoutIsTerminal: Effect.succeed(true) })),
 *   Effect.provideService(
 *     ConfigProvider.ConfigProvider,
 *     ConfigProvider.fromEnv({ env: { NO_COLOR: "1", FORCE_COLOR: "1" } })
 *   )
 * )
 *
 * Effect.runSync(program) // => false
 * ```
 *
 * @stability unstable
 * @category layers
 * @since 4.0.0
 */
export const layer: Layer.Layer<TerminalCapabilities, never, Stdio.Stdio> = Layer.effect(
  TerminalCapabilities
)(Effect.gen(function*() {
  const stdio = yield* Stdio.Stdio
  const env = yield* Effect.orDie(environment)
  return detect({
    noColor: Option.getOrUndefined(env.noColor),
    forceColor: Option.getOrUndefined(env.forceColor),
    term: Option.getOrUndefined(env.term),
    stdinIsTerminal: yield* stdio.stdinIsTerminal,
    stdoutIsTerminal: yield* stdio.stdoutIsTerminal
  })
}))
