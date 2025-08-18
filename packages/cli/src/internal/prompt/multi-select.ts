import * as Terminal from "@effect/platform/Terminal"
import * as Ansi from "@effect/printer-ansi/Ansi"
import * as Doc from "@effect/printer-ansi/AnsiDoc"
import * as Optimize from "@effect/printer/Optimize"
import * as Arr from "effect/Array"
import * as Effect from "effect/Effect"
import * as Number from "effect/Number"
import * as Option from "effect/Option"
import type * as Prompt from "../../Prompt.js"
import * as InternalPrompt from "../prompt.js"
import { Action } from "./action.js"
import * as InternalAnsiUtils from "./ansi-utils.js"
import { entriesToDisplay } from "./utils.js"

interface SelectOptions<A> extends Required<Prompt.Prompt.SelectOptions<A>> {}
interface MultiSelectOptions extends Prompt.Prompt.MultiSelectOptions {}

type State = {
  index: number
  selectedIndices: Set<number>
  error: Option.Option<string>
}

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

function renderError(state: State, pointer: Doc.AnsiDoc) {
  return Option.match(state.error, {
    onNone: () => Doc.empty,
    onSome: (error) =>
      Arr.match(error.split(NEWLINE_REGEX), {
        onEmpty: () => Doc.empty,
        onNonEmpty: (errorLines) => {
          const annotateLine = (line: string): Doc.AnsiDoc =>
            Doc.annotate(Doc.text(line), Ansi.combine(Ansi.italicized, Ansi.red))
          const prefix = Doc.cat(Doc.annotate(pointer, Ansi.red), Doc.space)
          const lines = Arr.map(errorLines, (str) => annotateLine(str))
          return Doc.cursorSavePosition.pipe(
            Doc.cat(Doc.hardLine),
            Doc.cat(prefix),
            Doc.cat(Doc.align(Doc.vsep(lines))),
            Doc.cat(Doc.cursorRestorePosition)
          )
        }
      })
  })
}

function renderChoiceDescription<A>(
  choice: Prompt.Prompt.SelectChoice<A>,
  isHighlighted: boolean
) {
  if (!choice.disabled && choice.description && isHighlighted) {
    return Doc.char("-").pipe(
      Doc.cat(Doc.space),
      Doc.cat(Doc.text(choice.description)),
      Doc.annotate(Ansi.blackBright)
    )
  }
  return Doc.empty
}

const metaOptionsCount = 2

function renderChoices<A>(
  state: State,
  options: SelectOptions<A> & MultiSelectOptions,
  figures: Effect.Effect.Success<typeof InternalAnsiUtils.figures>
) {
  const choices = options.choices
  const totalChoices = choices.length
  const selectedCount = state.selectedIndices.size
  const allSelected = selectedCount === totalChoices

  const selectAllText = allSelected
    ? options?.selectNone ?? "Select None"
    : options?.selectAll ?? "Select All"

  const inverseSelectionText = options?.inverseSelection ?? "Inverse Selection"

  const metaOptions = [
    { title: selectAllText },
    { title: inverseSelectionText }
  ]
  const allChoices = [...metaOptions, ...choices]
  const toDisplay = entriesToDisplay(state.index, allChoices.length, options.maxPerPage)
  const documents: Array<Doc.AnsiDoc> = []
  for (let index = toDisplay.startIndex; index < toDisplay.endIndex; index++) {
    const choice = allChoices[index]
    const isHighlighted = state.index === index
    let prefix: Doc.AnsiDoc = Doc.space
    if (index === toDisplay.startIndex && toDisplay.startIndex > 0) {
      prefix = figures.arrowUp
    } else if (index === toDisplay.endIndex - 1 && toDisplay.endIndex < allChoices.length) {
      prefix = figures.arrowDown
    }
    if (index < metaOptions.length) {
      // Meta options
      const title = isHighlighted
        ? Doc.annotate(Doc.text(choice.title), Ansi.cyanBright)
        : Doc.text(choice.title)
      documents.push(
        prefix.pipe(
          Doc.cat(Doc.space),
          Doc.cat(title)
        )
      )
    } else {
      // Regular choices
      const choiceIndex = index - metaOptions.length
      const isSelected = state.selectedIndices.has(choiceIndex)
      const checkbox = isSelected ? figures.checkboxOn : figures.checkboxOff
      const annotatedCheckbox = isHighlighted
        ? Doc.annotate(checkbox, Ansi.cyanBright)
        : checkbox
      const title = Doc.text(choice.title)
      const description = renderChoiceDescription(choice as Prompt.Prompt.SelectChoice<A>, isHighlighted)
      documents.push(
        prefix.pipe(
          Doc.cat(Doc.space),
          Doc.cat(annotatedCheckbox),
          Doc.cat(Doc.space),
          Doc.cat(title),
          Doc.cat(Doc.space),
          Doc.cat(description)
        )
      )
    }
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
    const error = renderError(state, figures.pointer)
    return Doc.cursorHide.pipe(
      Doc.cat(promptMsg),
      Doc.cat(Doc.hardLine),
      Doc.cat(choices),
      Doc.cat(error),
      Doc.render({ style: "pretty", options: { lineWidth: columns } })
    )
  })
}

function renderSubmission<A>(state: State, options: SelectOptions<A>) {
  return Effect.gen(function*() {
    const terminal = yield* Terminal.Terminal
    const columns = yield* terminal.columns
    const figures = yield* InternalAnsiUtils.figures
    const selectedChoices = Array.from(state.selectedIndices).sort(Number.Order).map((index) =>
      options.choices[index].title
    )
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

function processCursorUp(state: State, totalChoices: number) {
  const newIndex = state.index === 0 ? totalChoices - 1 : state.index - 1
  return Effect.succeed(Action.NextFrame({ state: { ...state, index: newIndex } }))
}

function processCursorDown(state: State, totalChoices: number) {
  const newIndex = (state.index + 1) % totalChoices
  return Effect.succeed(Action.NextFrame({ state: { ...state, index: newIndex } }))
}

function processSpace<A>(
  state: State,
  options: SelectOptions<A>
) {
  const selectedIndices = new Set(state.selectedIndices)
  if (state.index === 0) {
    if (state.selectedIndices.size === options.choices.length) {
      selectedIndices.clear()
    } else {
      for (let i = 0; i < options.choices.length; i++) {
        selectedIndices.add(i)
      }
    }
  } else if (state.index === 1) {
    for (let i = 0; i < options.choices.length; i++) {
      if (state.selectedIndices.has(i)) {
        selectedIndices.delete(i)
      } else {
        selectedIndices.add(i)
      }
    }
  } else {
    const choiceIndex = state.index - metaOptionsCount
    if (selectedIndices.has(choiceIndex)) {
      selectedIndices.delete(choiceIndex)
    } else {
      selectedIndices.add(choiceIndex)
    }
  }
  return Effect.succeed(Action.NextFrame({ state: { ...state, selectedIndices } }))
}

export function handleClear<A>(options: SelectOptions<A>) {
  return Effect.gen(function*() {
    const terminal = yield* Terminal.Terminal
    const columns = yield* terminal.columns
    const clearPrompt = Doc.cat(Doc.eraseLine, Doc.cursorLeft)
    const text = "\n".repeat(Math.min(options.choices.length + 2, options.maxPerPage)) + options.message + 1
    const clearOutput = InternalAnsiUtils.eraseText(text, columns)
    return clearOutput.pipe(
      Doc.cat(clearPrompt),
      Optimize.optimize(Optimize.Deep),
      Doc.render({ style: "pretty", options: { lineWidth: columns } })
    )
  })
}

function handleProcess<A>(options: SelectOptions<A> & MultiSelectOptions) {
  return (input: Terminal.UserInput, state: State) => {
    const totalChoices = options.choices.length + metaOptionsCount
    switch (input.key.name) {
      case "k":
      case "up": {
        return processCursorUp({ ...state, error: Option.none() }, totalChoices)
      }
      case "j":
      case "down":
      case "tab": {
        return processCursorDown({ ...state, error: Option.none() }, totalChoices)
      }
      case "space": {
        return processSpace(state, options)
      }
      case "enter":
      case "return": {
        const selectedCount = state.selectedIndices.size
        if (options.min !== undefined && selectedCount < options.min) {
          return Effect.succeed(
            Action.NextFrame({ state: { ...state, error: Option.some(`At least ${options.min} are required`) } })
          )
        }
        if (options.max !== undefined && selectedCount > options.max) {
          return Effect.succeed(
            Action.NextFrame({ state: { ...state, error: Option.some(`At most ${options.max} choices are allowed`) } })
          )
        }
        const selectedValues = Array.from(state.selectedIndices).sort(Number.Order).map((index) =>
          options.choices[index].value
        )
        return Effect.succeed(Action.Submit({ value: selectedValues }))
      }
      default: {
        return Effect.succeed(Action.Beep())
      }
    }
  }
}

function handleRender<A>(options: SelectOptions<A>) {
  return (state: State, action: Prompt.Prompt.Action<State, Array<A>>) => {
    return Action.$match(action, {
      Beep: () => Effect.succeed(renderBeep),
      NextFrame: ({ state }) => renderNextFrame(state, options),
      Submit: () => renderSubmission(state, options)
    })
  }
}

/** @internal */
export const multiSelect = <const A>(
  options: Prompt.Prompt.SelectOptions<A> & Prompt.Prompt.MultiSelectOptions
): Prompt.Prompt<Array<A>> => {
  const opts: SelectOptions<A> & MultiSelectOptions = {
    maxPerPage: 10,
    ...options
  }
  // Seed initial selection from choices marked as selected: true
  const initialSelected = new Set<number>()
  for (let i = 0; i < opts.choices.length; i++) {
    const choice = opts.choices[i] as Prompt.Prompt.SelectChoice<A>
    if (choice.selected === true) {
      initialSelected.add(i)
    }
  }
  return InternalPrompt.custom({ index: 0, selectedIndices: initialSelected, error: Option.none() }, {
    render: handleRender(opts),
    process: handleProcess(opts),
    clear: () => handleClear(opts)
  })
}
