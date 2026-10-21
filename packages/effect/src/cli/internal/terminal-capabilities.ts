import type * as TerminalCapabilities from "../TerminalCapabilities.ts"

const isPresent = (value: string | undefined): value is string => value !== undefined && value.length > 0

const isForcingColor = (value: string | undefined): boolean =>
  isPresent(value) && value !== "0" && value.toLowerCase() !== "false"

/**
 * Resolves terminal flags from environment values and TTY state.
 *
 * @internal
 */
export const detect = (input: {
  readonly noColor: string | undefined
  readonly forceColor: string | undefined
  readonly term: string | undefined
  readonly stdinIsTerminal: boolean
  readonly stdoutIsTerminal: boolean
}): TerminalCapabilities.Service => {
  if (input.term === "dumb") {
    return { canColor: false, canAnimate: false, canPrompt: false }
  }

  return {
    canColor: !isPresent(input.noColor) && (isForcingColor(input.forceColor) || input.stdoutIsTerminal),
    canAnimate: input.stdoutIsTerminal,
    canPrompt: input.stdinIsTerminal && input.stdoutIsTerminal
  }
}
