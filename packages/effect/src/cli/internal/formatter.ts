import * as Context from "../../Context.ts"
import * as Effect from "../../Effect.ts"
import * as CliOutput from "../CliOutput.ts"
import * as TerminalCapabilities from "../TerminalCapabilities.ts"

/**
 * The formatter for built-in command output. An installed `CliOutput.Formatter`
 * wins, then `TerminalCapabilities` decides whether the default formatter
 * colors, then the `CliOutput.Formatter` reference default applies.
 *
 * @internal
 */
export const resolveFormatter: Effect.Effect<CliOutput.Formatter> = Effect.contextWith((context) => {
  const formatter = Context.getOrUndefined(context, CliOutput.Formatter)
  if (formatter !== undefined) return Effect.succeed(formatter)
  const capabilities = Context.getOrUndefined(context, TerminalCapabilities.TerminalCapabilities)
  return Effect.succeed(
    capabilities === undefined
      ? Context.get(context, CliOutput.Formatter)
      : CliOutput.defaultFormatter({ colors: capabilities.canColor })
  )
})
