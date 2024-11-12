import * as Terminal from "@effect/platform/Terminal"
import * as Ansi from "@effect/printer-ansi/Ansi"
import * as Doc from "@effect/printer-ansi/AnsiDoc"
import * as Effect from "effect/Effect"
import type * as Prompt from "../../Prompt.js"
import * as InternalPrompt from "../prompt.js"
import { Action } from "./action.js"
import * as InternalAnsiUtils from "./ansi-utils.js"
import type { SelectMultiOptions, SelectOptions } from "./selectUtils.js"
import { handleClear, renderBeep, renderOutput } from "./selectUtils.js"
import { entriesToDisplay } from "./utils.js"

type MultiState = {
  index: number
  selectedIndices: Set<number>
}

const metaOptionsCount = 2

function renderMultiChoices<A>(
  state: MultiState,
  options: SelectOptions<A> & SelectMultiOptions,
  figures: Effect.Effect.Success<typeof InternalAnsiUtils.figures>
) {
  const choices = options.choices
  const totalChoices = choices.length
  const selectedCount = state.selectedIndices.size
  const allSelected = selectedCount === totalChoices

  const selectAllText = allSelected
    ? options.multiTexts?.selectNone ?? "Select None"
    : options.multiTexts?.selectAll ?? "Select All"

  const inverseSelectionText = options.multiTexts?.inverseSelection ?? "Inverse Selection"

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
  }
  return Doc.vsep(documents)
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

function processMultiCursorUp(state: MultiState, totalChoices: number) {
  const newIndex = state.index === 0 ? totalChoices - 1 : state.index - 1
  return Effect.succeed(Action.NextFrame({ state: { ...state, index: newIndex } }))
}

function processMultiCursorDown(state: MultiState, totalChoices: number) {
  const newIndex = (state.index + 1) % totalChoices
  return Effect.succeed(Action.NextFrame({ state: { ...state, index: newIndex } }))
}

function processMultiNext(state: MultiState, totalChoices: number) {
  const newIndex = (state.index + 1) % totalChoices
  return Effect.succeed(Action.NextFrame({ state: { ...state, index: newIndex } }))
}

function processMultiSpace<A>(
  state: MultiState,
  options: SelectOptions<A>
) {
  if (state.index === 0) {
    // "Select All" or "Select None" meta option
    const selectedIndices = new Set<number>()
    if (state.selectedIndices.size === options.choices.length) {
      // All selected, so deselect all
      // selectedIndices remains empty
    } else {
      // Not all selected, so select all
      for (let i = 0; i < options.choices.length; i++) {
        selectedIndices.add(i)
      }
    }
    return Effect.succeed(Action.NextFrame({ state: { ...state, selectedIndices } }))
  } else if (state.index === 1) {
    // "Inverse Selection" meta option
    const selectedIndices = new Set<number>()
    for (let i = 0; i < options.choices.length; i++) {
      if (!state.selectedIndices.has(i)) {
        selectedIndices.add(i)
      }
    }
    return Effect.succeed(Action.NextFrame({ state: { ...state, selectedIndices } }))
  } else {
    // Handle regular choices
    const selectedIndices = new Set(state.selectedIndices)
    const choiceIndex = state.index - metaOptionsCount
    if (selectedIndices.has(choiceIndex)) {
      selectedIndices.delete(choiceIndex)
    } else {
      selectedIndices.add(choiceIndex)
    }
    return Effect.succeed(Action.NextFrame({ state: { ...state, selectedIndices } }))
  }
}

function handleMultiProcess<A>(options: SelectOptions<A>) {
  return (input: Terminal.UserInput, state: MultiState) => {
    const totalChoices = options.choices.length + metaOptionsCount
    switch (input.key.name) {
      case "k":
      case "up": {
        return processMultiCursorUp(state, totalChoices)
      }
      case "j":
      case "down": {
        return processMultiCursorDown(state, totalChoices)
      }
      case "tab": {
        return processMultiNext(state, totalChoices)
      }
      case "space": {
        return processMultiSpace(state, options)
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
export const selectMulti = <A>(
  options: Prompt.Prompt.SelectOptions<A> & Prompt.Prompt.SelectMultiOptions
): Prompt.Prompt<Array<A>> => {
  const opts: SelectOptions<A> & SelectMultiOptions = {
    maxPerPage: 10,
    ...options
  }
  return InternalPrompt.custom({ index: 0, selectedIndices: new Set<number>() }, {
    render: handleMultiRender(opts),
    process: handleMultiProcess(opts),
    clear: () => handleClear(opts)
  })
}
