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
import { entriesToDisplay } from "./utils.js"

type State = number

interface SelectOptions<A> extends Required<Prompt.Prompt.SelectOptions<A>> {}

const renderBeep = Doc.render(Doc.beep, { style: "pretty" })

const NEWLINE_REGEX = /\r?\n/

function renderOutput<A>(
  leadingSymbol: Doc.AnsiDoc,
  trailingSymbol: Doc.AnsiDoc,
  options: SelectOptions<A>
) {
  const annotateLine = (line: string): Doc.AnsiDoc => Doc.annotate(Doc.text(line), Ansi.bold)
  const prefix = Doc.cat(leadingSymbol, Doc.space)
  return Arr.match(options.message.split(NEWLINE_REGEX), {
    onEmpty: () => Doc.hsep([prefix, trailingSymbol]),
    onNonEmpty: (promptLines) => {
      const lines = Arr.map(promptLines, (line) => annotateLine(line))
      return prefix.pipe(
        Doc.cat(Doc.nest(Doc.vsep(lines), 2)),
        Doc.cat(Doc.space),
        Doc.cat(trailingSymbol),
        Doc.cat(Doc.space)
      )
    }
  })
}

function renderChoicePrefix<A>(
  state: State,
  choices: SelectOptions<A>["choices"],
  toDisplay: { readonly startIndex: number; readonly endIndex: number },
  currentIndex: number,
  figures: Effect.Effect.Success<typeof InternalAnsiUtils.figures>
) {
  let prefix: Doc.AnsiDoc = Doc.space
  if (currentIndex === toDisplay.startIndex && toDisplay.startIndex > 0) {
    prefix = figures.arrowUp
  } else if (currentIndex === toDisplay.endIndex - 1 && toDisplay.endIndex < choices.length) {
    prefix = figures.arrowDown
  }
  if (choices[currentIndex].disabled) {
    const annotation = Ansi.combine(Ansi.bold, Ansi.blackBright)
    return state === currentIndex
      ? figures.pointer.pipe(Doc.annotate(annotation), Doc.cat(prefix))
      : prefix.pipe(Doc.cat(Doc.space))
  }
  return state === currentIndex
    ? figures.pointer.pipe(Doc.annotate(Ansi.cyanBright), Doc.cat(prefix))
    : prefix.pipe(Doc.cat(Doc.space))
}

function renderChoiceTitle<A>(
  choice: Prompt.Prompt.SelectChoice<A>,
  isSelected: boolean
) {
  const title = Doc.text(choice.title)
  if (isSelected) {
    return choice.disabled
      ? Doc.annotate(title, Ansi.combine(Ansi.underlined, Ansi.blackBright))
      : Doc.annotate(title, Ansi.combine(Ansi.underlined, Ansi.cyanBright))
  }
  return choice.disabled
    ? Doc.annotate(title, Ansi.combine(Ansi.strikethrough, Ansi.blackBright))
    : title
}

function renderChoiceDescription<A>(
  choice: Prompt.Prompt.SelectChoice<A>,
  isSelected: boolean
) {
  if (!choice.disabled && choice.description && isSelected) {
    return Doc.char("-").pipe(
      Doc.cat(Doc.space),
      Doc.cat(Doc.text(choice.description)),
      Doc.annotate(Ansi.blackBright)
    )
  }
  return Doc.empty
}

function renderChoices<A>(
  state: State,
  options: SelectOptions<A>,
  figures: Effect.Effect.Success<typeof InternalAnsiUtils.figures>
) {
  const choices = options.choices
  const toDisplay = entriesToDisplay(state, choices.length, options.maxPerPage)
  const documents: Array<Doc.AnsiDoc> = []
  for (let index = toDisplay.startIndex; index < toDisplay.endIndex; index++) {
    const choice = choices[index]
    const isSelected = state === index
    const prefix = renderChoicePrefix(state, choices, toDisplay, index, figures)
    const title = renderChoiceTitle(choice, isSelected)
    const description = renderChoiceDescription(choice, isSelected)
    documents.push(prefix.pipe(Doc.cat(title), Doc.cat(Doc.space), Doc.cat(description)))
  }
  return Doc.vsep(documents)
}

function renderNextFrame<A>(state: State, options: SelectOptions<A>) {
  return Effect.gen(function*() {
    const terminal = yield* Terminal.Terminal
    const columns = yield* terminal.columns
    const figures = yield* InternalAnsiUtils.figures
    const choices = renderChoices(state, options, figures)
    const leadingSymbol = Doc.annotate(Doc.text("?"), Ansi.cyanBright)
    const trailingSymbol = Doc.annotate(figures.pointerSmall, Ansi.blackBright)
    const promptMsg = renderOutput(leadingSymbol, trailingSymbol, options)
    return Doc.cursorHide.pipe(
      Doc.cat(promptMsg),
      Doc.cat(Doc.hardLine),
      Doc.cat(choices),
      Doc.render({ style: "pretty", options: { lineWidth: columns } })
    )
  })
}

function renderSubmission<A>(state: State, options: SelectOptions<A>) {
  return Effect.gen(function*() {
    const terminal = yield* Terminal.Terminal
    const columns = yield* terminal.columns
    const figures = yield* InternalAnsiUtils.figures
    const selected = Doc.text(options.choices[state].title)
    const leadingSymbol = Doc.annotate(figures.tick, Ansi.green)
    const trailingSymbol = Doc.annotate(figures.ellipsis, Ansi.blackBright)
    const promptMsg = renderOutput(leadingSymbol, trailingSymbol, options)
    return promptMsg.pipe(
      Doc.cat(Doc.space),
      Doc.cat(Doc.annotate(selected, Ansi.white)),
      Doc.cat(Doc.hardLine),
      Doc.render({ style: "pretty", options: { lineWidth: columns } })
    )
  })
}

function processCursorUp<A>(state: State, choices: Prompt.Prompt.SelectOptions<A>["choices"]) {
  if (state === 0) {
    return Effect.succeed(Action.NextFrame({ state: choices.length - 1 }))
  }
  return Effect.succeed(Action.NextFrame({ state: state - 1 }))
}

function processCursorDown<A>(state: State, choices: Prompt.Prompt.SelectOptions<A>["choices"]) {
  if (state === choices.length - 1) {
    return Effect.succeed(Action.NextFrame({ state: 0 }))
  }
  return Effect.succeed(Action.NextFrame({ state: state + 1 }))
}

function processNext<A>(state: State, choices: Prompt.Prompt.SelectOptions<A>["choices"]) {
  return Effect.succeed(Action.NextFrame({ state: (state + 1) % choices.length }))
}

function handleRender<A>(options: SelectOptions<A>) {
  return (state: State, action: Prompt.Prompt.Action<State, A>) => {
    return Action.$match(action, {
      Beep: () => Effect.succeed(renderBeep),
      NextFrame: ({ state }) => renderNextFrame(state, options),
      Submit: () => renderSubmission(state, options)
    })
  }
}

export function handleClear<A>(options: SelectOptions<A>) {
  return Effect.gen(function*() {
    const terminal = yield* Terminal.Terminal
    const columns = yield* terminal.columns
    const clearPrompt = Doc.cat(Doc.eraseLine, Doc.cursorLeft)
    const text = "\n".repeat(Math.min(options.choices.length, options.maxPerPage)) + options.message
    const clearOutput = InternalAnsiUtils.eraseText(text, columns)
    return clearOutput.pipe(
      Doc.cat(clearPrompt),
      Optimize.optimize(Optimize.Deep),
      Doc.render({ style: "pretty", options: { lineWidth: columns } })
    )
  })
}

function handleProcess<A>(options: SelectOptions<A>) {
  return (input: Terminal.UserInput, state: State) => {
    switch (input.key.name) {
      case "k":
      case "up": {
        return processCursorUp(state, options.choices)
      }
      case "j":
      case "down": {
        return processCursorDown(state, options.choices)
      }
      case "tab": {
        return processNext(state, options.choices)
      }
      case "enter":
      case "return": {
        const selected = options.choices[state]
        if (selected.disabled) {
          return Effect.succeed(Action.Beep())
        }
        return Effect.succeed(Action.Submit({ value: selected.value }))
      }
      default: {
        return Effect.succeed(Action.Beep())
      }
    }
  }
}

/** @internal */
export const select = <const A>(options: Prompt.Prompt.SelectOptions<A>): Prompt.Prompt<A> => {
  const opts: SelectOptions<A> = {
    maxPerPage: 10,
    ...options
  }
  // Validate and seed initial index from any choice marked selected: true
  let initialIndex = 0
  let seenSelected = -1
  for (let i = 0; i < opts.choices.length; i++) {
    const choice = opts.choices[i] as Prompt.Prompt.SelectChoice<A>
    if (choice.selected === true) {
      if (seenSelected !== -1) {
        throw new Error("InvalidArgumentException: only a single choice can be selected by default for Prompt.select")
      }
      seenSelected = i
    }
  }
  if (seenSelected !== -1) {
    initialIndex = seenSelected
  }
  return InternalPrompt.custom(initialIndex, {
    render: handleRender(opts),
    process: handleProcess(opts),
    clear: () => handleClear(opts)
  })
}
