import * as Terminal from "@effect/platform/Terminal"
import * as Ansi from "@effect/printer-ansi/Ansi"
import * as Doc from "@effect/printer-ansi/AnsiDoc"
import * as Optimize from "@effect/printer/Optimize"
import * as Effect from "effect/Effect"
import { pipe } from "effect/Function"
import * as Option from "effect/Option"
import * as ReadonlyArray from "effect/ReadonlyArray"
import type * as Prompt from "../../Prompt.js"
import * as InternalPrompt from "../prompt.js"
import * as InternalPromptAction from "./action.js"
import * as InternalAnsiUtils from "./ansi-utils.js"

interface State {
  readonly value: boolean
}

const renderBeep = Doc.render(Doc.beep, { style: "pretty" })

const renderClearScreen = (
  prevState: Option.Option<State>,
  options: Required<Prompt.Prompt.ToggleOptions>,
  columns: number
): Doc.AnsiDoc => {
  const clearPrompt = Doc.cat(Doc.eraseLine, Doc.cursorLeft)
  if (Option.isNone(prevState)) {
    return clearPrompt
  }
  const clearOutput = InternalAnsiUtils.eraseText(options.message, columns)
  return Doc.cat(clearOutput, clearPrompt)
}

const renderToggle = (
  value: boolean,
  options: Required<Prompt.Prompt.ToggleOptions>,
  submitted: boolean = false
) => {
  const separator = pipe(Doc.char("/"), Doc.annotate(Ansi.blackBright))
  const selectedAnnotation = Ansi.combine(Ansi.underlined, submitted ? Ansi.white : Ansi.cyanBright)
  const inactive = value
    ? Doc.text(options.inactive)
    : Doc.annotate(Doc.text(options.inactive), selectedAnnotation)
  const active = value
    ? Doc.annotate(Doc.text(options.active), selectedAnnotation)
    : Doc.text(options.active)
  return Doc.hsep([active, separator, inactive])
}

const renderOutput = (
  toggle: Doc.AnsiDoc,
  leadingSymbol: Doc.AnsiDoc,
  trailingSymbol: Doc.AnsiDoc,
  options: Required<Prompt.Prompt.ToggleOptions>
): Doc.AnsiDoc => {
  const annotateLine = (line: string): Doc.AnsiDoc => pipe(Doc.text(line), Doc.annotate(Ansi.bold))
  const promptLines = options.message.split(/\r?\n/)
  const prefix = Doc.cat(leadingSymbol, Doc.space)
  if (ReadonlyArray.isNonEmptyReadonlyArray(promptLines)) {
    const lines = ReadonlyArray.map(promptLines, (line) => annotateLine(line))
    return pipe(
      prefix,
      Doc.cat(Doc.nest(Doc.vsep(lines), 2)),
      Doc.cat(Doc.space),
      Doc.cat(trailingSymbol),
      Doc.cat(Doc.space),
      Doc.cat(toggle)
    )
  }
  return Doc.hsep([prefix, trailingSymbol, toggle])
}

const renderNextFrame = (
  prevState: Option.Option<State>,
  nextState: State,
  options: Required<Prompt.Prompt.ToggleOptions>
): Effect.Effect<Terminal.Terminal, never, string> =>
  Effect.gen(function*(_) {
    const terminal = yield* _(Terminal.Terminal)
    const figures = yield* _(InternalAnsiUtils.figures)
    const columns = yield* _(terminal.columns)
    const clearScreen = renderClearScreen(prevState, options, columns)
    const leadingSymbol = Doc.annotate(Doc.text("?"), Ansi.cyanBright)
    const trailingSymbol = Doc.annotate(figures.pointerSmall, Ansi.blackBright)
    const toggle = renderToggle(nextState.value, options)
    const promptMsg = renderOutput(toggle, leadingSymbol, trailingSymbol, options)
    return pipe(
      clearScreen,
      Doc.cat(Doc.cursorHide),
      Doc.cat(promptMsg),
      Optimize.optimize(Optimize.Deep),
      Doc.render({ style: "pretty" })
    )
  })

const renderSubmission = (
  nextState: State,
  value: boolean,
  options: Required<Prompt.Prompt.ToggleOptions>
) =>
  Effect.gen(function*(_) {
    const terminal = yield* _(Terminal.Terminal)
    const figures = yield* _(InternalAnsiUtils.figures)
    const columns = yield* _(terminal.columns)
    const clearScreen = renderClearScreen(Option.some(nextState), options, columns)
    const leadingSymbol = Doc.annotate(figures.tick, Ansi.green)
    const trailingSymbol = Doc.annotate(figures.ellipsis, Ansi.blackBright)
    const toggle = renderToggle(value, options, true)
    const promptMsg = renderOutput(toggle, leadingSymbol, trailingSymbol, options)
    return pipe(
      clearScreen,
      Doc.cat(promptMsg),
      Doc.cat(Doc.hardLine),
      Optimize.optimize(Optimize.Deep),
      Doc.render({ style: "pretty" })
    )
  })

const activate = Effect.succeed(InternalPromptAction.nextFrame({ value: true }))
const deactivate = Effect.succeed(InternalPromptAction.nextFrame({ value: false }))

/** @internal */
export const toggle = (options: Prompt.Prompt.ToggleOptions): Prompt.Prompt<boolean> => {
  const opts: Required<Prompt.Prompt.ToggleOptions> = {
    initial: false,
    active: "on",
    inactive: "off",
    ...options
  }
  return InternalPrompt.custom(
    { value: opts.initial } as State,
    (prevState, nextState, action) => {
      switch (action._tag) {
        case "Beep": {
          return Effect.succeed(renderBeep)
        }
        case "NextFrame": {
          return renderNextFrame(prevState, nextState, opts)
        }
        case "Submit": {
          return renderSubmission(nextState, action.value, opts)
        }
      }
    },
    (input, state) => {
      switch (input.key.name) {
        case "0":
        case "j":
        case "delete":
        case "right":
        case "down": {
          return deactivate
        }
        case "1":
        case "k":
        case "left":
        case "up": {
          return activate
        }
        case " ":
        case "tab": {
          return state.value ? deactivate : activate
        }
        case "enter":
        case "return": {
          return Effect.succeed(InternalPromptAction.submit(state.value))
        }
        default: {
          return Effect.succeed(InternalPromptAction.beep)
        }
      }
    }
  )
}
