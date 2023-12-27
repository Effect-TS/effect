import * as Terminal from "@effect/platform/Terminal"
import * as Ansi from "@effect/printer-ansi/Ansi"
import * as Doc from "@effect/printer-ansi/AnsiDoc"
import * as Effect from "effect/Effect"
import { pipe } from "effect/Function"
import * as Option from "effect/Option"
import * as ReadonlyArray from "effect/ReadonlyArray"
import type * as Prompt from "../../Prompt.js"
import * as InternalPrompt from "../prompt.js"
import * as InternalPromptAction from "./action.js"
import * as InternalAnsiUtils from "./ansi-utils.js"
import { entriesToDisplay } from "./utils.js"

interface State {
  readonly cursor: number
}

const renderBeep = Doc.render(Doc.beep, { style: "pretty" })

const renderClearScreen = <A>(
  prevState: Option.Option<State>,
  options: Required<Prompt.Prompt.SelectOptions<A>>,
  columns: number
): Doc.AnsiDoc => {
  const clearPrompt = Doc.cat(Doc.eraseLine, Doc.cursorLeft)
  if (Option.isNone(prevState)) {
    return clearPrompt
  }
  const text = "\n".repeat(Math.min(options.choices.length, options.maxPerPage)) + options.message
  const clearOutput = InternalAnsiUtils.eraseText(text, columns)
  return Doc.cat(clearOutput, clearPrompt)
}

const renderChoicePrefix = <A>(
  nextState: State,
  choices: Prompt.Prompt.SelectOptions<A>["choices"],
  toDisplay: { readonly startIndex: number; readonly endIndex: number },
  currentIndex: number,
  figures: Effect.Effect.Success<typeof InternalAnsiUtils.figures>
): Doc.AnsiDoc => {
  let prefix: Doc.AnsiDoc = Doc.space
  if (currentIndex === toDisplay.startIndex && toDisplay.startIndex > 0) {
    prefix = figures.arrowUp
  } else if (currentIndex === toDisplay.endIndex - 1 && toDisplay.endIndex < choices.length) {
    prefix = figures.arrowDown
  }
  if (choices[currentIndex].disabled) {
    const annotation = Ansi.combine(Ansi.bold, Ansi.blackBright)
    return nextState.cursor === currentIndex
      ? pipe(figures.pointer, Doc.annotate(annotation), Doc.cat(prefix))
      : pipe(prefix, Doc.cat(Doc.space))
  }
  return nextState.cursor === currentIndex
    ? pipe(figures.pointer, Doc.annotate(Ansi.cyanBright), Doc.cat(prefix))
    : pipe(prefix, Doc.cat(Doc.space))
}

const renderChoiceTitle = <A>(
  choice: Prompt.Prompt.SelectChoice<A>,
  isSelected: boolean
): Doc.AnsiDoc => {
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

const renderChoiceDescription = <A>(
  choice: Prompt.Prompt.SelectChoice<A>,
  isSelected: boolean
): Doc.AnsiDoc => {
  if (!choice.disabled && choice.description && isSelected) {
    return pipe(
      Doc.char("-"),
      Doc.cat(Doc.space),
      Doc.cat(Doc.text(choice.description)),
      Doc.annotate(Ansi.blackBright)
    )
  }
  return Doc.empty
}

const renderChoices = <A>(
  nextState: State,
  options: Prompt.Prompt.SelectOptions<A>,
  figures: Effect.Effect.Success<typeof InternalAnsiUtils.figures>
): Doc.AnsiDoc => {
  const choices = options.choices
  const toDisplay = entriesToDisplay(nextState.cursor, choices.length, options.maxPerPage)
  const choicesToRender = choices.slice(toDisplay.startIndex, toDisplay.endIndex)
  const docs = ReadonlyArray.map(choicesToRender, (choice, currentIndex) => {
    const prefix = renderChoicePrefix(nextState, choicesToRender, toDisplay, currentIndex, figures)
    const title = renderChoiceTitle(choice, nextState.cursor === currentIndex)
    const description = renderChoiceDescription(choice, nextState.cursor === currentIndex)
    return pipe(prefix, Doc.cat(title), Doc.cat(Doc.space), Doc.cat(description))
  })
  return Doc.vsep(docs)
}

const renderOutput = <A>(
  leadingSymbol: Doc.AnsiDoc,
  trailingSymbol: Doc.AnsiDoc,
  options: Required<Prompt.Prompt.SelectOptions<A>>
): Doc.AnsiDoc => {
  const annotateLine = (line: string): Doc.AnsiDoc => Doc.annotate(Doc.text(line), Ansi.bold)
  const prefix = Doc.cat(leadingSymbol, Doc.space)
  return ReadonlyArray.match(options.message.split(/\r?\n/), {
    onEmpty: () => Doc.hsep([prefix, trailingSymbol]),
    onNonEmpty: (promptLines) => {
      const lines = ReadonlyArray.map(promptLines, (line) => annotateLine(line))
      return pipe(
        prefix,
        Doc.cat(Doc.nest(Doc.vsep(lines), 2)),
        Doc.cat(Doc.space),
        Doc.cat(trailingSymbol),
        Doc.cat(Doc.space)
      )
    }
  })
}

const renderNextFrame = <A>(
  prevState: Option.Option<State>,
  nextState: State,
  options: Required<Prompt.Prompt.SelectOptions<A>>
): Effect.Effect<Terminal.Terminal, never, string> =>
  Effect.gen(function*(_) {
    const terminal = yield* _(Terminal.Terminal)
    const figures = yield* _(InternalAnsiUtils.figures)
    const columns = yield* _(terminal.columns)
    const choices = renderChoices(nextState, options, figures)
    const clearScreen = renderClearScreen(prevState, options, columns)
    const leadingSymbol = Doc.annotate(Doc.text("?"), Ansi.cyanBright)
    const trailingSymbol = Doc.annotate(figures.pointerSmall, Ansi.blackBright)
    const promptMsg = renderOutput(leadingSymbol, trailingSymbol, options)
    return pipe(
      clearScreen,
      Doc.cat(Doc.cursorHide),
      Doc.cat(promptMsg),
      Doc.cat(Doc.hardLine),
      Doc.cat(choices),
      Doc.render({ style: "pretty" })
    )
  })

const renderSubmission = <A>(
  state: State,
  options: Required<Prompt.Prompt.SelectOptions<A>>
) =>
  Effect.gen(function*(_) {
    const terminal = yield* _(Terminal.Terminal)
    const figures = yield* _(InternalAnsiUtils.figures)
    const columns = yield* _(terminal.columns)
    const selected = Doc.text(options.choices[state.cursor].title)
    const clearScreen = renderClearScreen(Option.some(state), options, columns)
    const leadingSymbol = Doc.annotate(figures.tick, Ansi.green)
    const trailingSymbol = Doc.annotate(figures.ellipsis, Ansi.blackBright)
    const promptMsg = renderOutput(leadingSymbol, trailingSymbol, options)
    return pipe(
      clearScreen,
      Doc.cat(promptMsg),
      Doc.cat(Doc.space),
      Doc.cat(Doc.annotate(selected, Ansi.white)),
      Doc.cat(Doc.hardLine),
      Doc.render({ style: "pretty" })
    )
  })

const initialState: State = { cursor: 0 }

const processCursorUp = <A>(state: State, choices: Prompt.Prompt.SelectOptions<A>["choices"]) => {
  if (state.cursor === 0) {
    return Effect.succeed(InternalPromptAction.nextFrame({ cursor: choices.length - 1 }))
  }
  return Effect.succeed(InternalPromptAction.nextFrame({ cursor: state.cursor - 1 }))
}

const processCursorDown = <A>(state: State, choices: Prompt.Prompt.SelectOptions<A>["choices"]) => {
  if (state.cursor === choices.length - 1) {
    return Effect.succeed(InternalPromptAction.nextFrame({ cursor: 0 }))
  }
  return Effect.succeed(InternalPromptAction.nextFrame({ cursor: state.cursor + 1 }))
}

const processNext = <A>(state: State, choices: Prompt.Prompt.SelectOptions<A>["choices"]) =>
  Effect.succeed(InternalPromptAction.nextFrame({ cursor: (state.cursor + 1) % choices.length }))

/** @internal */
export const select = <A>(options: Prompt.Prompt.SelectOptions<A>): Prompt.Prompt<A> => {
  const opts: Required<Prompt.Prompt.SelectOptions<A>> = {
    maxPerPage: 10,
    ...options
  }
  return InternalPrompt.custom(
    initialState,
    (prevState, nextState, action) => {
      switch (action._tag) {
        case "Beep": {
          return Effect.succeed(renderBeep)
        }
        case "NextFrame": {
          return renderNextFrame(prevState, nextState, opts)
        }
        case "Submit": {
          return renderSubmission(nextState, opts)
        }
      }
    },
    (input, state) => {
      switch (input.key.name) {
        case "k":
        case "up": {
          return processCursorUp(state, opts.choices)
        }
        case "j":
        case "down": {
          return processCursorDown(state, opts.choices)
        }
        case "tab": {
          return processNext(state, opts.choices)
        }
        case "enter":
        case "return": {
          const selected = opts.choices[state.cursor]
          if (selected.disabled) {
            return Effect.succeed(InternalPromptAction.beep)
          }
          return Effect.succeed(InternalPromptAction.submit(selected.value))
        }
        default: {
          return Effect.succeed(InternalPromptAction.beep)
        }
      }
    }
  )
}
