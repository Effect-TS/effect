import * as Terminal from "@effect/platform/Terminal"
import type * as AnsiDoc from "@effect/printer-ansi/AnsiDoc"
import * as AnsiRender from "@effect/printer-ansi/AnsiRender"
import * as AnsiStyle from "@effect/printer-ansi/AnsiStyle"
import * as Color from "@effect/printer-ansi/Color"
import * as Doc from "@effect/printer/Doc"
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
  readonly cursor: number
  readonly offset: number
  readonly value: string
  readonly error: Option.Option<string>
}

const renderBeep = AnsiRender.prettyDefault(InternalAnsiUtils.beep)

const renderClearScreen = (
  prevState: Option.Option<State>,
  options: Required<Prompt.Prompt.TextOptions>,
  columns: number
): AnsiDoc.AnsiDoc => {
  // Erase the main prompt line and place the cursor in column one
  const clearPrompt = Doc.cat(InternalAnsiUtils.eraseLine, InternalAnsiUtils.cursorLeft)
  // If there is no previous state, then this is the first render, so there is
  // no need to clear the error output or any previous prompt output - we can
  // just clear the current line for the prompt
  if (Option.isNone(prevState)) {
    return clearPrompt
  }
  // If there was a previous state, check for any error output
  const clearError = Option.match(prevState.value.error, {
    onNone: () => Doc.empty,
    onSome: (error) =>
      // If there was an error, move the cursor down to the final error line and
      // then clear all lines of error output
      pipe(
        InternalAnsiUtils.cursorDown(InternalAnsiUtils.lines(error, columns)),
        Doc.cat(InternalAnsiUtils.eraseText(`\n${error}`, columns))
      )
  })
  // Ensure that the prior prompt output is cleaned up
  const clearOutput = InternalAnsiUtils.eraseText(options.message, columns)
  // Concatenate and return all documents
  return Doc.cat(clearError, Doc.cat(clearOutput, clearPrompt))
}

const renderInput = (
  nextState: State,
  options: Required<Prompt.Prompt.TextOptions>,
  submitted: boolean = false
): AnsiDoc.AnsiDoc => {
  const annotation = Option.match(nextState.error, {
    onNone: () =>
      submitted
        ? AnsiStyle.color(Color.white)
        : AnsiStyle.combine(AnsiStyle.underlined, AnsiStyle.color(Color.green)),
    onSome: () => AnsiStyle.color(Color.red)
  })
  switch (options.type) {
    case "hidden": {
      return Doc.empty
    }
    case "password": {
      return Doc.annotate(Doc.text("*".repeat(nextState.value.length)), annotation)
    }
    case "text": {
      return Doc.annotate(Doc.text(nextState.value), annotation)
    }
  }
}

const renderError = (nextState: State, pointer: AnsiDoc.AnsiDoc): AnsiDoc.AnsiDoc =>
  Option.match(nextState.error, {
    onNone: () => Doc.empty,
    onSome: (error) => {
      const errorLines = error.split(/\r?\n/)
      if (ReadonlyArray.isNonEmptyReadonlyArray(errorLines)) {
        const annotateLine = (line: string): AnsiDoc.AnsiDoc =>
          Doc.annotate(
            Doc.text(line),
            AnsiStyle.combine(AnsiStyle.italicized, AnsiStyle.color(Color.red))
          )
        const prefix = Doc.cat(Doc.annotate(pointer, AnsiStyle.color(Color.red)), Doc.space)
        const lines = ReadonlyArray.map(errorLines, (str) => annotateLine(str))
        return pipe(
          InternalAnsiUtils.cursorSave,
          Doc.cat(Doc.hardLine),
          Doc.cat(prefix),
          Doc.cat(Doc.align(Doc.vsep(lines))),
          Doc.cat(InternalAnsiUtils.cursorRestore)
        )
      }
      return Doc.empty
    }
  })

const renderOutput = (
  nextState: State,
  leadingSymbol: AnsiDoc.AnsiDoc,
  trailingSymbol: AnsiDoc.AnsiDoc,
  options: Required<Prompt.Prompt.TextOptions>
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
      Doc.cat(Doc.space),
      Doc.cat(renderInput(nextState, options))
    )
  }
  return Doc.hsep([prefix, trailingSymbol, renderInput(nextState, options)])
}

const renderNextFrame = (
  prevState: Option.Option<State>,
  nextState: State,
  options: Required<Prompt.Prompt.TextOptions>
): Effect.Effect<Terminal.Terminal, never, string> =>
  Effect.gen(function*(_) {
    const terminal = yield* _(Terminal.Terminal)
    const figures = yield* _(InternalAnsiUtils.figures)
    const clearScreen = renderClearScreen(prevState, options, terminal.columns)
    const leadingSymbol = Doc.annotate(Doc.text("?"), AnsiStyle.color(Color.cyan))
    const trailingSymbol = Doc.annotate(figures.pointerSmall, AnsiStyle.color(Color.black))
    const promptMsg = renderOutput(nextState, leadingSymbol, trailingSymbol, options)
    const errorMsg = renderError(nextState, figures.pointerSmall)
    return pipe(
      clearScreen,
      Doc.cat(promptMsg),
      Doc.cat(errorMsg),
      Doc.cat(InternalAnsiUtils.cursorMove(nextState.offset)),
      Optimize.optimize(Optimize.Deep),
      AnsiRender.prettyDefault
    )
  })

const renderSubmission = (
  nextState: State,
  options: Required<Prompt.Prompt.TextOptions>
) =>
  Effect.gen(function*(_) {
    const terminal = yield* _(Terminal.Terminal)
    const figures = yield* _(InternalAnsiUtils.figures)
    const clearScreen = renderClearScreen(Option.some(nextState), options, terminal.columns)
    const leadingSymbol = Doc.annotate(figures.tick, AnsiStyle.color(Color.green))
    const trailingSymbol = Doc.annotate(figures.ellipsis, AnsiStyle.color(Color.black))
    const promptMsg = renderOutput(nextState, leadingSymbol, trailingSymbol, options)
    return pipe(
      clearScreen,
      Doc.cat(promptMsg),
      Doc.cat(Doc.hardLine),
      Optimize.optimize(Optimize.Deep),
      AnsiRender.prettyDefault
    )
  })

const processBackspace = (currentState: State) => {
  if (currentState.cursor <= 0) {
    return Effect.succeed(InternalPromptAction.beep)
  }
  const beforeCursor = currentState.value.slice(0, currentState.cursor - 1)
  const afterCursor = currentState.value.slice(currentState.cursor)
  const cursor = currentState.cursor - 1
  const value = `${beforeCursor}${afterCursor}`
  return Effect.succeed(InternalPromptAction.nextFrame({
    ...currentState,
    cursor,
    value,
    error: Option.none()
  }))
}

const processCursorLeft = (currentState: State) => {
  if (currentState.cursor <= 0) {
    return Effect.succeed(InternalPromptAction.beep)
  }
  const cursor = currentState.cursor - 1
  const offset = currentState.offset - 1
  return Effect.succeed(InternalPromptAction.nextFrame({
    ...currentState,
    cursor,
    offset,
    error: Option.none()
  }))
}

const processCursorRight = (currentState: State) => {
  if (currentState.cursor >= currentState.value.length) {
    return Effect.succeed(InternalPromptAction.beep)
  }
  const cursor = Math.min(currentState.cursor + 1, currentState.value.length)
  const offset = Math.min(currentState.offset + 1, currentState.value.length)
  return Effect.succeed(InternalPromptAction.nextFrame({
    ...currentState,
    cursor,
    offset,
    error: Option.none()
  }))
}

const defaultProcessor = (input: string, currentState: State) => {
  const beforeCursor = currentState.value.slice(0, currentState.cursor)
  const afterCursor = currentState.value.slice(currentState.cursor)
  const value = `${beforeCursor}${input}${afterCursor}`
  const cursor = beforeCursor.length + 1
  return Effect.succeed(InternalPromptAction.nextFrame({
    ...currentState,
    cursor,
    value,
    error: Option.none()
  }))
}

const initialState: State = {
  cursor: 0,
  offset: 0,
  value: "",
  error: Option.none()
}

/** @internal */
export const text = (options: Prompt.Prompt.TextOptions): Prompt.Prompt<string> => {
  const opts: Required<Prompt.Prompt.TextOptions> = {
    default: "",
    type: "text",
    validate: Effect.succeed,
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
        case "backspace": {
          return processBackspace(state)
        }
        case "left": {
          return processCursorLeft(state)
        }
        case "right": {
          return processCursorRight(state)
        }
        case "enter":
        case "return": {
          return Effect.match(opts.validate(state.value), {
            onFailure: (error) =>
              InternalPromptAction.nextFrame({
                ...state,
                error: Option.some(error)
              }),
            onSuccess: InternalPromptAction.submit
          })
        }
        default: {
          const value = Option.getOrElse(input.input, () => "")
          return defaultProcessor(value, state)
        }
      }
    }
  )
}
