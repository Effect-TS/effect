/**
 * Opt-in detection of whether a CLI can color, animate, or prompt.
 *
 * `TerminalCapabilities` answers the three questions every terminal UI asks
 * before it renders: will styling be shown, is anybody watching the output,
 * and can a question be answered. The detecting layer reads `NO_COLOR`,
 * `FORCE_COLOR`, and `TERM` through `ConfigProvider`, plus the TTY state of
 * `Stdio`. Apps that never install the layer keep today's formatter behavior.
 *
 * @since 4.0.0
 */
import * as Config from "../../Config.ts"
import * as Context from "../../Context.ts"
import * as Effect from "../../Effect.ts"
import * as Layer from "../../Layer.ts"
import * as Option from "../../Option.ts"
import * as Stdio from "../../Stdio.ts"

/**
 * Terminal rendering flags for one process.
 *
 * **Details**
 *
 * `canColor` is about whether styling will be rendered rather than stored as
 * bytes. `canAnimate` is about whether output is being watched, so pacing
 * means something. `canPrompt` is about whether a question can be asked and
 * answered. `Prompt` does not consult `canPrompt` yet.
 *
 * @category models
 * @since 4.0.0
 */
export interface Service {
  readonly canColor: boolean
  readonly canAnimate: boolean
  readonly canPrompt: boolean
}

/**
 * Service tag for terminal capability detection.
 *
 * **When to use**
 *
 * Install {@link layer} when help, logs, and prompts should share one answer.
 * Leave it out and `CliOutput` keeps its built-in TTY check.
 *
 * @category services
 * @since 4.0.0
 */
export class TerminalCapabilities extends Context.Service<TerminalCapabilities, Service>()(
  "effect/unstable/cli/TerminalCapabilities"
) {}

const isPresent = (value: string | undefined): value is string => value !== undefined && value.length > 0

/**
 * `0` and `false` decline to force color. Any other non-empty value forces it,
 * including off a TTY. An empty value is unset.
 */
const isForcingColor = (value: string | undefined): boolean => {
  if (!isPresent(value)) {
    return false
  }
  const normalized = value.toLowerCase()
  return normalized !== "0" && normalized !== "false"
}

/**
 * Resolves terminal flags from already-loaded environment values and TTY state.
 *
 * **Details**
 *
 * `TERM=dumb` clears all three flags, because a terminal that cannot move the
 * cursor can neither animate nor redraw a prompt. Otherwise `NO_COLOR`, when
 * set to any non-empty value, disables color and wins over `FORCE_COLOR`.
 * `FORCE_COLOR` forces color even off a TTY, except for `0` and `false`, which
 * mean "not forcing". Empty values are unset. `canPrompt` still requires both
 * standard input and standard output to be terminals.
 *
 * **Example** (NO_COLOR wins over FORCE_COLOR)
 *
 * ```ts import.meta.vitest
 * import { TerminalCapabilities } from "effect/unstable/cli"
 *
 * const caps = TerminalCapabilities.detect({
 *   noColor: "1",
 *   forceColor: "1",
 *   term: "xterm-256color",
 *   stdinIsTerminal: true,
 *   stdoutIsTerminal: true
 * })
 *
 * caps.canColor // => false
 * caps.canPrompt // => true
 * ```
 *
 * @category constructors
 * @since 4.0.0
 */
export const detect = (input: {
  readonly noColor: string | undefined
  readonly forceColor: string | undefined
  readonly term: string | undefined
  readonly stdinIsTerminal: boolean
  readonly stdoutIsTerminal: boolean
}): Service => {
  if (input.term === "dumb") {
    return { canColor: false, canAnimate: false, canPrompt: false }
  }

  let canColor = input.stdoutIsTerminal
  if (isForcingColor(input.forceColor)) {
    canColor = true
  }
  if (isPresent(input.noColor)) {
    canColor = false
  }

  return {
    canColor,
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
 * **When to use**
 *
 * Provide this layer to opt in. Tests inject both the TTY flags and the
 * environment, so the precedence rules do not depend on the host machine.
 *
 * **Details**
 *
 * An empty environment value is unset, matching `ConfigProvider.fromEnv`.
 * `FORCE_COLOR=` therefore does not force color on.
 *
 * @see {@link detect} for the precedence rules
 *
 * @category layers
 * @since 4.0.0
 */
export const layer: Layer.Layer<TerminalCapabilities, Config.ConfigError, Stdio.Stdio> = Layer.effect(
  TerminalCapabilities
)(Effect.gen(function*() {
  const stdio = yield* Stdio.Stdio
  const env = yield* environment
  const [stdinIsTerminal, stdoutIsTerminal] = yield* Effect.all([
    stdio.stdinIsTerminal,
    stdio.stdoutIsTerminal
  ])

  return detect({
    noColor: Option.getOrUndefined(env.noColor),
    forceColor: Option.getOrUndefined(env.forceColor),
    term: Option.getOrUndefined(env.term),
    stdinIsTerminal,
    stdoutIsTerminal
  })
}))
