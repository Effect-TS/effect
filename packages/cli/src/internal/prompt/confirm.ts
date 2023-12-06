import * as Terminal from "@effect/platform/Terminal"
import * as Ansi from "@effect/printer-ansi/Ansi"
import * as Doc from "@effect/printer-ansi/AnsiDoc"
import * as Optimize from "@effect/printer/Optimize"
import * as Effect from "effect/Effect"
import { pipe } from "effect/Function"
import * as Option from "effect/Option"
import * as ReadonlyArray from "effect/ReadonlyArray"
import type * as Prompt from "../../Prompt.js"
import type * as PromptAction from "../../Prompt/Action.js"
import * as InternalPrompt from "../prompt.js"
import * as InternalPromptAction from "./action.js"
import * as InternalAnsiUtils from "./ansi-utils.js"

interface State {
  readonly value: boolean
}

const renderBeep = Doc.render(Doc.beep, { style: "pretty" })

const renderClearScreen = (
  prevState: Option.Option<State>,
  options: Required<Prompt.Prompt.ConfirmOptions>,
  columns: number
): Doc.AnsiDoc => {
  const resetCurrentLine = Doc.cat(Doc.eraseLine, Doc.cursorLeft)
  if (Option.isNone(prevState)) {
    return resetCurrentLine
  }
  const clearOutput = InternalAnsiUtils.eraseText(options.message, columns)
  return Doc.cat(clearOutput, resetCurrentLine)
}

const renderOutput = (
  confirm: Doc.AnsiDoc,
  leadingSymbol: Doc.AnsiDoc,
  trailingSymbol: Doc.AnsiDoc,
  options: Required<Prompt.Prompt.ConfirmOptions>
): Doc.AnsiDoc => {
  const annotateLine = (line: string): Doc.AnsiDoc => pipe(Doc.text(line), Doc.annotate(Ansi.bold))
  const prefix = Doc.cat(leadingSymbol, Doc.space)
  return ReadonlyArray.match(options.message.split(/\r?\n/), {
    onEmpty: () => Doc.hsep([prefix, trailingSymbol, confirm]),
    onNonEmpty: (promptLines) => {
      const lines = ReadonlyArray.map(promptLines, (line) => annotateLine(line))
      return pipe(
        prefix,
        Doc.cat(Doc.nest(Doc.vsep(lines), 2)),
        Doc.cat(Doc.space),
        Doc.cat(trailingSymbol),
        Doc.cat(Doc.space),
        Doc.cat(confirm)
      )
    }
  })
}

const renderNextFrame = (
  prevState: Option.Option<State>,
  nextState: State,
  options: Required<Prompt.Prompt.ConfirmOptions>
): Effect.Effect<Terminal.Terminal, never, string> =>
  Effect.gen(function*(_) {
    const terminal = yield* _(Terminal.Terminal)
    const figures = yield* _(InternalAnsiUtils.figures)
    const columns = yield* _(terminal.columns)
    const clearScreen = renderClearScreen(prevState, options, columns)
    const leadingSymbol = Doc.annotate(Doc.text("?"), Ansi.cyanBright)
    const trailingSymbol = Doc.annotate(figures.pointerSmall, Ansi.blackBright)
    const confirmAnnotation = Ansi.blackBright
    // Marking these explicitly as present with `!` because they always will be
    // and there is really no value in adding a `DeepRequired` type helper just
    // for these internal cases
    const confirmMessage = nextState.value
      ? options.placeholder.defaultConfirm!
      : options.placeholder.defaultDeny!
    const confirm = Doc.annotate(Doc.text(confirmMessage), confirmAnnotation)
    const promptMsg = renderOutput(confirm, leadingSymbol, trailingSymbol, options)
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
  options: Required<Prompt.Prompt.ConfirmOptions>
) =>
  Effect.gen(function*(_) {
    const terminal = yield* _(Terminal.Terminal)
    const figures = yield* _(InternalAnsiUtils.figures)
    const columns = yield* _(terminal.columns)
    const clearScreen = renderClearScreen(Option.some(nextState), options, columns)
    const leadingSymbol = Doc.annotate(figures.tick, Ansi.green)
    const trailingSymbol = Doc.annotate(figures.ellipsis, Ansi.blackBright)
    const confirmMessage = value ? options.label.confirm : options.label.deny
    const confirm = Doc.text(confirmMessage)
    const promptMsg = renderOutput(confirm, leadingSymbol, trailingSymbol, options)
    return pipe(
      clearScreen,
      Doc.cat(promptMsg),
      Doc.cat(Doc.hardLine),
      Optimize.optimize(Optimize.Deep),
      Doc.render({ style: "pretty" })
    )
  })

const TRUE_VALUE_REGEX = /^y|t$/
const FALSE_VALUE_REGEX = /^n|f$/

const processInputValue = (
  value: string
): Effect.Effect<never, never, PromptAction.PromptAction<State, boolean>> => {
  if (TRUE_VALUE_REGEX.test(value.toLowerCase())) {
    return Effect.succeed(InternalPromptAction.submit(true))
  }
  if (FALSE_VALUE_REGEX.test(value.toLowerCase())) {
    return Effect.succeed(InternalPromptAction.submit(false))
  }
  return Effect.succeed(InternalPromptAction.beep)
}

/** @internal */
export const confirm = (options: Prompt.Prompt.ConfirmOptions): Prompt.Prompt<boolean> => {
  const opts: Required<Prompt.Prompt.ConfirmOptions> = {
    initial: false,
    ...options,
    label: {
      confirm: "yes",
      deny: "no",
      ...options.label
    },
    placeholder: {
      defaultConfirm: "(Y/n)",
      defaultDeny: "(y/N)",
      ...options.placeholder
    }
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
    (input, _) => {
      const value = Option.getOrElse(input.input, () => "")
      return processInputValue(value)
    }
  )
}
