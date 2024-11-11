import * as Terminal from "@effect/platform/Terminal"
import { Optimize } from "@effect/printer"
import * as Ansi from "@effect/printer-ansi/Ansi"
import * as Doc from "@effect/printer-ansi/AnsiDoc"
import * as Arr from "effect/Array"
import * as Effect from "effect/Effect"
import type * as Prompt from "../../Prompt.js"
import * as InternalPrompt from "../prompt.js"
import { Action } from "./action.js"
import * as InternalAnsiUtils from "./ansi-utils.js"
import { entriesToDisplay } from "./utils.js"

interface SelectOptions<A> extends Required<Prompt.Prompt.SelectOptions<A>> {}

type State = number

type MultiState = {
  index: number
  selectedIndices: Set<number>
}

const renderBeep = Doc.render(Doc.beep, { style: "pretty" })

function handleClear<A>(options: SelectOptions<A>) {
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

function renderMultiChoices<A>(
  state: MultiState,
  options: SelectOptions<A>,
  figures: Effect.Effect.Success<typeof InternalAnsiUtils.figures>
) {
  const choices = options.choices
  const toDisplay = entriesToDisplay(state.index, choices.length, options.maxPerPage)
  const documents: Array<Doc.AnsiDoc> = []
  for (let index = toDisplay.startIndex; index < toDisplay.endIndex; index++) {
    const choice = choices[index]
    const isHighlighted = state.index === index
    const isSelected = state.selectedIndices.has(index)
    let prefix: Doc.AnsiDoc = Doc.space
    if (index === toDisplay.startIndex && toDisplay.startIndex > 0) {
      prefix = figures.arrowUp
    } else if (index === toDisplay.endIndex - 1 && toDisplay.endIndex < choices.length) {
      prefix = figures.arrowDown
    }
    const checkbox = isSelected ? "[x]" : "[ ]"
    const annotatedCheckbox = isHighlighted
      ? Doc.annotate(Doc.text(checkbox), Ansi.cyanBright)
      : Doc.text(checkbox)
    const title = Doc.text(choice.title)
    documents.push(
      prefix.pipe(
        Doc.cat(Doc.space),
        Doc.cat(annotatedCheckbox),
        Doc.cat(Doc.space),
        Doc.cat(title)
      )
    )
  }
  return Doc.vsep(documents)
}

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

function renderMultiNextFrame<A>(state: MultiState, options: SelectOptions<A>) {
  return Effect.gen(function*() {
    const terminal = yield* Terminal.Terminal
    const columns = yield* terminal.columns
    const figures = yield* InternalAnsiUtils.figures
    const choices = renderMultiChoices(state, options, figures)
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

function renderMultiSubmission<A>(state: MultiState, options: SelectOptions<A>) {
  return Effect.gen(function*() {
    const terminal = yield* Terminal.Terminal
    const columns = yield* terminal.columns
    const figures = yield* InternalAnsiUtils.figures
    const selectedChoices = Array.from(state.selectedIndices).map((index) => options.choices[index].title)
    const selectedText = selectedChoices.join(", ")
    const selected = Doc.text(selectedText)
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

function handleMultiProcess<A>(options: SelectOptions<A>) {
  return (input: Terminal.UserInput, state: MultiState) => {
    switch (input.key.name) {
      case "k":
      case "up": {
        const newIndex = state.index === 0 ? options.choices.length - 1 : state.index - 1
        return Effect.succeed(Action.NextFrame({ state: { ...state, index: newIndex } }))
      }
      case "j":
      case "down": {
        const newIndex = (state.index + 1) % options.choices.length
        return Effect.succeed(Action.NextFrame({ state: { ...state, index: newIndex } }))
      }
      case "space": {
        const selectedIndices = new Set(state.selectedIndices)
        if (selectedIndices.has(state.index)) {
          selectedIndices.delete(state.index)
        } else {
          selectedIndices.add(state.index)
        }
        return Effect.succeed(Action.NextFrame({ state: { ...state, selectedIndices } }))
      }
      case "enter":
      case "return": {
        const selectedValues = Array.from(state.selectedIndices).map((index) => options.choices[index].value)
        return Effect.succeed(Action.Submit({ value: selectedValues }))
      }
      default: {
        return Effect.succeed(Action.Beep())
      }
    }
  }
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

function handleMultiRender<A>(options: SelectOptions<A>) {
  return (state: MultiState, action: Prompt.Prompt.Action<MultiState, Array<A>>) => {
    return Action.$match(action, {
      Beep: () => Effect.succeed(renderBeep),
      NextFrame: ({ state }) => renderMultiNextFrame(state, options),
      Submit: () => renderMultiSubmission(state, options)
    })
  }
}

/** @internal */
export const select = <A>(options: Prompt.Prompt.SelectOptions<A>): Prompt.Prompt<A> => {
  const opts: SelectOptions<A> = {
    maxPerPage: 10,
    ...options
  }
  return InternalPrompt.custom(0, {
    render: handleRender(opts),
    process: handleProcess(opts),
    clear: () => handleClear(opts)
  })
}

/** @internal */
export const selectMulti = <A>(options: Prompt.Prompt.SelectOptions<A>): Prompt.Prompt<Array<A>> => {
  const opts: SelectOptions<A> = {
    maxPerPage: 10,
    ...options
  }
  return InternalPrompt.custom({ index: 0, selectedIndices: new Set<number>() }, {
    render: handleMultiRender(opts),
    process: handleMultiProcess(opts),
    clear: () => handleClear(opts)
  })
}
