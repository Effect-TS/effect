import * as Terminal from "@effect/platform/Terminal"
import type * as AnsiDoc from "@effect/printer-ansi/AnsiDoc"
import * as AnsiRender from "@effect/printer-ansi/AnsiRender"
import * as AnsiStyle from "@effect/printer-ansi/AnsiStyle"
import * as Color from "@effect/printer-ansi/Color"
import * as Doc from "@effect/printer/Doc"
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

const renderBeep = AnsiRender.prettyDefault(InternalAnsiUtils.beep)

const renderClearScreen = <A>(
  prevState: Option.Option<State>,
  options: Prompt.Prompt.SelectOptions<A>,
  columns: number
): AnsiDoc.AnsiDoc => {
  const clearPrompt = Doc.cat(InternalAnsiUtils.eraseLine, InternalAnsiUtils.cursorLeft)
  if (Option.isNone(prevState)) {
    return clearPrompt
  }
  const text = "\n".repeat(options.choices.length) + options.message
  const clearOutput = InternalAnsiUtils.eraseText(text, columns)
  return Doc.cat(clearOutput, clearPrompt)
}

const renderChoicePrefix = <A>(
  nextState: State,
  choices: Prompt.Prompt.SelectOptions<A>["choices"],
  toDisplay: { readonly startIndex: number; readonly endIndex: number },
  currentIndex: number,
  figures: Effect.Effect.Success<typeof InternalAnsiUtils.figures>
): AnsiDoc.AnsiDoc => {
  let prefix: AnsiDoc.AnsiDoc = Doc.space
  if (currentIndex === toDisplay.startIndex && toDisplay.startIndex > 0) {
    prefix = figures.arrowUp
  } else if (currentIndex === toDisplay.endIndex - 1 && toDisplay.endIndex < choices.length) {
    prefix = figures.arrowDown
  }
  if (choices[currentIndex]!.disabled) {
    const annotation = AnsiStyle.combine(AnsiStyle.bold, AnsiStyle.color(Color.black))
    return nextState.cursor === currentIndex
      ? pipe(
        Doc.annotate(figures.pointer, annotation),
        Doc.cat(prefix)
      )
      : Doc.cat(Doc.space, prefix)
  }
  return nextState.cursor === currentIndex
    ? pipe(
      Doc.annotate(figures.pointer, AnsiStyle.color(Color.green)),
      Doc.cat(prefix)
    )
    : Doc.cat(Doc.space, prefix)
}

const renderChoiceTitle = <A>(
  choice: Prompt.Prompt.SelectChoice<A>,
  isSelected: boolean
): AnsiDoc.AnsiDoc => {
  const title = Doc.text(choice.title)
  const blackUnderlined = AnsiStyle.combine(AnsiStyle.underlined, AnsiStyle.color(Color.black))
  const greenUnderlined = AnsiStyle.combine(AnsiStyle.underlined, AnsiStyle.color(Color.green))
  if (isSelected) {
    return choice.disabled
      ? Doc.annotate(title, blackUnderlined)
      : Doc.annotate(title, greenUnderlined)
  }
  return choice.disabled
    // TODO: strikethrough in printer?
    ? Doc.annotate(title, blackUnderlined)
    : title
}

const renderChoiceDescription = <A>(
  choice: Prompt.Prompt.SelectChoice<A>,
  isSelected: boolean
): AnsiDoc.AnsiDoc => {
  if (!choice.disabled && choice.description && isSelected) {
    return pipe(
      Doc.char("-"),
      Doc.cat(Doc.space),
      Doc.cat(Doc.text(choice.description)),
      Doc.annotate(AnsiStyle.color(Color.black))
    )
  }
  return Doc.empty
}

const renderChoices = <A>(
  nextState: State,
  options: Prompt.Prompt.SelectOptions<A>,
  figures: Effect.Effect.Success<typeof InternalAnsiUtils.figures>
): AnsiDoc.AnsiDoc => {
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
  leadingSymbol: AnsiDoc.AnsiDoc,
  trailingSymbol: AnsiDoc.AnsiDoc,
  options: Required<Prompt.Prompt.SelectOptions<A>>
): AnsiDoc.AnsiDoc => {
  const annotateLine = (line: string): AnsiDoc.AnsiDoc =>
    Doc.annotate(Doc.text(line), AnsiStyle.bold)
  const promptLines = options.message.split(/\r?\n/)
  const prefix = Doc.cat(leadingSymbol, Doc.space)
  if (ReadonlyArray.isNonEmptyReadonlyArray(promptLines)) {
    const lines = ReadonlyArray.map(promptLines, (line) => annotateLine(line))
    return pipe(
      prefix,
      Doc.cat(Doc.nest(Doc.vsep(lines), 2)),
      Doc.cat(Doc.space),
      Doc.cat(trailingSymbol),
      Doc.cat(Doc.space)
    )
  }
  return Doc.hsep([prefix, trailingSymbol])
}

const renderNextFrame = <A>(
  prevState: Option.Option<State>,
  nextState: State,
  options: Required<Prompt.Prompt.SelectOptions<A>>
): Effect.Effect<Terminal.Terminal, never, string> =>
  Effect.gen(function*(_) {
    const terminal = yield* _(Terminal.Terminal)
    const figures = yield* _(InternalAnsiUtils.figures)
    const choices = renderChoices(nextState, options, figures)
    const clearScreen = renderClearScreen(prevState, options, terminal.columns)
    const leadingSymbol = Doc.annotate(Doc.text("?"), AnsiStyle.color(Color.cyan))
    const trailingSymbol = Doc.annotate(figures.pointerSmall, AnsiStyle.color(Color.black))
    const promptMsg = renderOutput(leadingSymbol, trailingSymbol, options)
    return pipe(
      clearScreen,
      Doc.cat(InternalAnsiUtils.cursorHide),
      Doc.cat(promptMsg),
      Doc.cat(Doc.hardLine),
      Doc.cat(choices),
      // TODO: figure out what the bug is here that screws up formatting
      // Optimize.optimize(Optimize.Deep),
      AnsiRender.prettyDefault
    )
  })

const renderSubmission = <A>(
  state: State,
  options: Required<Prompt.Prompt.SelectOptions<A>>
) =>
  Effect.gen(function*(_) {
    const terminal = yield* _(Terminal.Terminal)
    const figures = yield* _(InternalAnsiUtils.figures)
    const selected = Doc.text(options.choices[state.cursor].title)
    const clearScreen = renderClearScreen(Option.some(state), options, terminal.columns)
    const leadingSymbol = Doc.annotate(figures.tick, AnsiStyle.color(Color.green))
    const trailingSymbol = Doc.annotate(figures.ellipsis, AnsiStyle.color(Color.black))
    const promptMsg = renderOutput(leadingSymbol, trailingSymbol, options)
    return pipe(
      clearScreen,
      Doc.cat(promptMsg),
      Doc.cat(Doc.space),
      Doc.cat(Doc.annotate(selected, AnsiStyle.color(Color.white))),
      Doc.cat(Doc.hardLine),
      // TODO: figure out what the bug is here that screws up formatting
      // Optimize.optimize(Optimize.Deep),
      AnsiRender.prettyDefault
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
          return Effect.succeed(InternalPromptAction.submit(opts.choices[state.cursor].value))
        }
        default: {
          return Effect.succeed(InternalPromptAction.beep)
        }
      }
    }
  )
}
