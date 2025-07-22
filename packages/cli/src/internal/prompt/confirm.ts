import * as Terminal from "@effect/platform/Terminal"
import * as Ansi from "@effect/printer-ansi/Ansi"
import * as Doc from "@effect/printer-ansi/AnsiDoc"
import * as Optimize from "@effect/printer/Optimize"
import * as Arr from "effect/Array"
import * as Effect from "effect/Effect"
import * as Option from "effect/Option"
import type * as Prompt from "../../Prompt.js"
import * as InternalPrompt from "../prompt.js"
import { Action } from "./action.js"
import * as InternalAnsiUtils from "./ansi-utils.js"

interface Options extends Required<Prompt.Prompt.ConfirmOptions> {}

interface State {
  readonly value: boolean
}

const renderBeep = Doc.render(Doc.beep, { style: "pretty" })

function handleClear(options: Options) {
  return Effect.gen(function*() {
    const terminal = yield* Terminal.Terminal
    const columns = yield* terminal.columns
    const clearOutput = InternalAnsiUtils.eraseText(options.message, columns)
    const resetCurrentLine = Doc.cat(Doc.eraseLine, Doc.cursorLeft)
    return clearOutput.pipe(
      Doc.cat(resetCurrentLine),
      Optimize.optimize(Optimize.Deep),
      Doc.render({ style: "pretty", options: { lineWidth: columns } })
    )
  })
}

const NEWLINE_REGEX = /\r?\n/

function renderOutput(
  confirm: Doc.AnsiDoc,
  leadingSymbol: Doc.AnsiDoc,
  trailingSymbol: Doc.AnsiDoc,
  options: Options
) {
  const annotateLine = (line: string): Doc.AnsiDoc => Doc.annotate(Doc.text(line), Ansi.bold)
  const prefix = Doc.cat(leadingSymbol, Doc.space)
  return Arr.match(options.message.split(NEWLINE_REGEX), {
    onEmpty: () => Doc.hsep([prefix, trailingSymbol, confirm]),
    onNonEmpty: (promptLines) => {
      const lines = Arr.map(promptLines, (line) => annotateLine(line))
      return prefix.pipe(
        Doc.cat(Doc.nest(Doc.vsep(lines), 2)),
        Doc.cat(Doc.space),
        Doc.cat(trailingSymbol),
        Doc.cat(Doc.space),
        Doc.cat(confirm)
      )
    }
  })
}

function renderNextFrame(state: State, options: Options) {
  return Effect.gen(function*() {
    const terminal = yield* Terminal.Terminal
    const columns = yield* terminal.columns
    const figures = yield* InternalAnsiUtils.figures
    const leadingSymbol = Doc.annotate(Doc.text("?"), Ansi.cyanBright)
    const trailingSymbol = Doc.annotate(figures.pointerSmall, Ansi.blackBright)
    // Marking these explicitly as present with `!` because they always will be
    // and there is really no value in adding a `DeepRequired` type helper just
    // for these internal cases
    const confirmMessage = state.value
      ? options.placeholder.defaultConfirm!
      : options.placeholder.defaultDeny!
    const confirm = Doc.annotate(Doc.text(confirmMessage), Ansi.blackBright)
    const promptMsg = renderOutput(confirm, leadingSymbol, trailingSymbol, options)
    return Doc.cursorHide.pipe(
      Doc.cat(promptMsg),
      Optimize.optimize(Optimize.Deep),
      Doc.render({ style: "pretty", options: { lineWidth: columns } })
    )
  })
}

function renderSubmission(value: boolean, options: Options) {
  return Effect.gen(function*() {
    const terminal = yield* Terminal.Terminal
    const columns = yield* terminal.columns
    const figures = yield* InternalAnsiUtils.figures
    const leadingSymbol = Doc.annotate(figures.tick, Ansi.green)
    const trailingSymbol = Doc.annotate(figures.ellipsis, Ansi.blackBright)
    const confirmMessage = value ? options.label.confirm : options.label.deny
    const confirm = Doc.text(confirmMessage)
    const promptMsg = renderOutput(confirm, leadingSymbol, trailingSymbol, options)
    return promptMsg.pipe(
      Doc.cat(Doc.hardLine),
      Optimize.optimize(Optimize.Deep),
      Doc.render({ style: "pretty", options: { lineWidth: columns } })
    )
  })
}

function handleRender(options: Options) {
  return (_: State, action: Prompt.Prompt.Action<State, boolean>) => {
    return Action.$match(action, {
      Beep: () => Effect.succeed(renderBeep),
      NextFrame: ({ state }) => renderNextFrame(state, options),
      Submit: ({ value }) => renderSubmission(value, options)
    })
  }
}

const TRUE_VALUE_REGEX = /^y|t$/
const FALSE_VALUE_REGEX = /^n|f$/

function handleProcess(input: Terminal.UserInput, defaultValue: boolean) {
  const value = Option.getOrElse(input.input, () => "")
  if (input.key.name === "enter" || input.key.name === "return") {
    return Effect.succeed(Action.Submit({ value: defaultValue }))
  }
  if (TRUE_VALUE_REGEX.test(value.toLowerCase())) {
    return Effect.succeed(Action.Submit({ value: true }))
  }
  if (FALSE_VALUE_REGEX.test(value.toLowerCase())) {
    return Effect.succeed(Action.Submit({ value: false }))
  }
  return Effect.succeed(Action.Beep())
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
  const initialState: State = { value: opts.initial }
  return InternalPrompt.custom(initialState, {
    render: handleRender(opts),
    process: (input) => handleProcess(input, opts.initial),
    clear: () => handleClear(opts)
  })
}
