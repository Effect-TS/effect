import * as Terminal from "@effect/platform/Terminal"
import * as Ansi from "@effect/printer-ansi/Ansi"
import * as Doc from "@effect/printer-ansi/AnsiDoc"
import * as Optimize from "@effect/printer/Optimize"
import * as Arr from "effect/Array"
import * as Effect from "effect/Effect"
import type * as Prompt from "../../Prompt.js"
import * as InternalPrompt from "../prompt.js"
import { Action } from "./action.js"
import * as InternalAnsiUtils from "./ansi-utils.js"

interface ToggleOptions extends Required<Prompt.Prompt.ToggleOptions> {}

type State = boolean

const renderBeep = Doc.render(Doc.beep, { style: "pretty" })

function handleClear(options: ToggleOptions) {
  return Effect.gen(function*() {
    const terminal = yield* Terminal.Terminal
    const columns = yield* terminal.columns
    const clearPrompt = Doc.cat(Doc.eraseLine, Doc.cursorLeft)
    const clearOutput = InternalAnsiUtils.eraseText(options.message, columns)
    return clearOutput.pipe(
      Doc.cat(clearPrompt),
      Optimize.optimize(Optimize.Deep),
      Doc.render({ style: "pretty", options: { lineWidth: columns } })
    )
  })
}

function renderToggle(
  value: boolean,
  options: ToggleOptions,
  submitted: boolean = false
) {
  const separator = Doc.annotate(Doc.char("/"), Ansi.blackBright)
  const selectedAnnotation = Ansi.combine(Ansi.underlined, submitted ? Ansi.white : Ansi.cyanBright)
  const inactive = value
    ? Doc.text(options.inactive)
    : Doc.annotate(Doc.text(options.inactive), selectedAnnotation)
  const active = value
    ? Doc.annotate(Doc.text(options.active), selectedAnnotation)
    : Doc.text(options.active)
  return Doc.hsep([active, separator, inactive])
}

function renderOutput(
  toggle: Doc.AnsiDoc,
  leadingSymbol: Doc.AnsiDoc,
  trailingSymbol: Doc.AnsiDoc,
  options: ToggleOptions
) {
  const annotateLine = (line: string): Doc.AnsiDoc => Doc.annotate(Doc.text(line), Ansi.bold)
  const promptLines = options.message.split(/\r?\n/)
  const prefix = Doc.cat(leadingSymbol, Doc.space)
  if (Arr.isNonEmptyReadonlyArray(promptLines)) {
    const lines = Arr.map(promptLines, (line) => annotateLine(line))
    return prefix.pipe(
      Doc.cat(Doc.nest(Doc.vsep(lines), 2)),
      Doc.cat(Doc.space),
      Doc.cat(trailingSymbol),
      Doc.cat(Doc.space),
      Doc.cat(toggle)
    )
  }
  return Doc.hsep([prefix, trailingSymbol, toggle])
}

function renderNextFrame(state: State, options: ToggleOptions) {
  return Effect.gen(function*() {
    const terminal = yield* Terminal.Terminal
    const figures = yield* InternalAnsiUtils.figures
    const columns = yield* terminal.columns
    const leadingSymbol = Doc.annotate(Doc.text("?"), Ansi.cyanBright)
    const trailingSymbol = Doc.annotate(figures.pointerSmall, Ansi.blackBright)
    const toggle = renderToggle(state, options)
    const promptMsg = renderOutput(toggle, leadingSymbol, trailingSymbol, options)
    return Doc.cursorHide.pipe(
      Doc.cat(promptMsg),
      Optimize.optimize(Optimize.Deep),
      Doc.render({ style: "pretty", options: { lineWidth: columns } })
    )
  })
}

function renderSubmission(value: boolean, options: ToggleOptions) {
  return Effect.gen(function*() {
    const terminal = yield* Terminal.Terminal
    const figures = yield* InternalAnsiUtils.figures
    const columns = yield* terminal.columns
    const leadingSymbol = Doc.annotate(figures.tick, Ansi.green)
    const trailingSymbol = Doc.annotate(figures.ellipsis, Ansi.blackBright)
    const toggle = renderToggle(value, options, true)
    const promptMsg = renderOutput(toggle, leadingSymbol, trailingSymbol, options)
    return promptMsg.pipe(
      Doc.cat(Doc.hardLine),
      Optimize.optimize(Optimize.Deep),
      Doc.render({ style: "pretty", options: { lineWidth: columns } })
    )
  })
}

const activate = Effect.succeed(Action.NextFrame({ state: true }))
const deactivate = Effect.succeed(Action.NextFrame({ state: false }))

function handleRender(options: ToggleOptions) {
  return (state: State, action: Prompt.Prompt.Action<State, boolean>) => {
    switch (action._tag) {
      case "Beep": {
        return Effect.succeed(renderBeep)
      }
      case "NextFrame": {
        return renderNextFrame(state, options)
      }
      case "Submit": {
        return renderSubmission(state, options)
      }
    }
  }
}

function handleProcess(input: Terminal.UserInput, state: State) {
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
      return state ? deactivate : activate
    }
    case "enter":
    case "return": {
      return Effect.succeed(Action.Submit({ value: state }))
    }
    default: {
      return Effect.succeed(Action.Beep())
    }
  }
}

/** @internal */
export const toggle = (options: Prompt.Prompt.ToggleOptions): Prompt.Prompt<boolean> => {
  const opts: ToggleOptions = {
    initial: false,
    active: "on",
    inactive: "off",
    ...options
  }
  return InternalPrompt.custom(opts.initial, {
    render: handleRender(opts),
    process: handleProcess,
    clear: () => handleClear(opts)
  })
}
