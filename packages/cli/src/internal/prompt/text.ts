import * as Terminal from "@effect/platform/Terminal"
import * as Ansi from "@effect/printer-ansi/Ansi"
import * as Doc from "@effect/printer-ansi/AnsiDoc"
import * as Optimize from "@effect/printer/Optimize"
import * as Effect from "effect/Effect"
import { pipe } from "effect/Function"
import * as Option from "effect/Option"
import * as ReadonlyArray from "effect/ReadonlyArray"
import * as Secret from "effect/Secret"
import type * as Prompt from "../../Prompt.js"
import * as InternalPrompt from "../prompt.js"
import * as InternalPromptAction from "./action.js"
import * as InternalAnsiUtils from "./ansi-utils.js"

interface Options extends Required<Prompt.Prompt.TextOptions> {
  /**
   * The type of the text option.
   */
  readonly type: "hidden" | "password" | "text"
}

interface State {
  readonly cursor: number
  readonly offset: number
  readonly value: string
  readonly error: Option.Option<string>
}

const renderBeep = Doc.render(Doc.beep, { style: "pretty" })

const renderClearScreen = (
  prevState: Option.Option<State>,
  options: Options,
  columns: number
): Doc.AnsiDoc => {
  // Erase the current line and place the cursor in column one
  const resetCurrentLine = Doc.cat(Doc.eraseLine, Doc.cursorLeft)
  // If there is no previous state, then this is the first render, so there is
  // no need to clear the error output or any previous prompt output - we can
  // just clear the current line for the prompt
  if (Option.isNone(prevState)) {
    return resetCurrentLine
  }
  // If there was a previous state, check for any error output
  const clearError = Option.match(prevState.value.error, {
    onNone: () => Doc.empty,
    onSome: (error) =>
      // If there was an error, move the cursor down to the final error line and
      // then clear all lines of error output
      pipe(
        Doc.cursorDown(InternalAnsiUtils.lines(error, columns)),
        // Add a leading newline to the error message to ensure that the corrrect
        // number of error lines are erased
        Doc.cat(InternalAnsiUtils.eraseText(`\n${error}`, columns))
      )
  })
  // Ensure that the prior prompt output is cleaned up
  const clearOutput = InternalAnsiUtils.eraseText(options.message, columns)
  // Concatenate and return all documents
  return Doc.cat(clearError, Doc.cat(clearOutput, resetCurrentLine))
}

const renderInput = (
  nextState: State,
  options: Options,
  submitted: boolean
): Doc.AnsiDoc => {
  const annotation = Option.match(nextState.error, {
    onNone: () => submitted ? Ansi.white : Ansi.combine(Ansi.underlined, Ansi.cyanBright),
    onSome: () => Ansi.red
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

const renderError = (nextState: State, pointer: Doc.AnsiDoc): Doc.AnsiDoc =>
  Option.match(nextState.error, {
    onNone: () => Doc.empty,
    onSome: (error) =>
      ReadonlyArray.match(error.split(/\r?\n/), {
        onEmpty: () => Doc.empty,
        onNonEmpty: (errorLines) => {
          const annotateLine = (line: string): Doc.AnsiDoc =>
            pipe(
              Doc.text(line),
              Doc.annotate(Ansi.combine(Ansi.italicized, Ansi.red))
            )
          const prefix = Doc.cat(Doc.annotate(pointer, Ansi.red), Doc.space)
          const lines = ReadonlyArray.map(errorLines, (str) => annotateLine(str))
          return pipe(
            Doc.cursorSavePosition,
            Doc.cat(Doc.hardLine),
            Doc.cat(prefix),
            Doc.cat(Doc.align(Doc.vsep(lines))),
            Doc.cat(Doc.cursorRestorePosition)
          )
        }
      })
  })

const renderOutput = (
  nextState: State,
  leadingSymbol: Doc.AnsiDoc,
  trailingSymbol: Doc.AnsiDoc,
  options: Options,
  submitted: boolean = false
): Doc.AnsiDoc => {
  const annotateLine = (line: string): Doc.AnsiDoc => pipe(Doc.text(line), Doc.annotate(Ansi.bold))
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
      Doc.cat(renderInput(nextState, options, submitted))
    )
  }
  return Doc.hsep([prefix, trailingSymbol, renderInput(nextState, options, submitted)])
}

const renderNextFrame = (
  prevState: Option.Option<State>,
  nextState: State,
  options: Options
): Effect.Effect<Terminal.Terminal, never, string> =>
  Effect.gen(function*(_) {
    const terminal = yield* _(Terminal.Terminal)
    const figures = yield* _(InternalAnsiUtils.figures)
    const columns = yield* _(terminal.columns)
    const clearScreen = renderClearScreen(prevState, options, columns)
    const leadingSymbol = Doc.annotate(Doc.text("?"), Ansi.cyanBright)
    const trailingSymbol = Doc.annotate(figures.pointerSmall, Ansi.blackBright)
    const promptMsg = renderOutput(nextState, leadingSymbol, trailingSymbol, options)
    const errorMsg = renderError(nextState, figures.pointerSmall)
    return pipe(
      clearScreen,
      Doc.cat(promptMsg),
      Doc.cat(errorMsg),
      Doc.cat(Doc.cursorMove(nextState.offset)),
      Optimize.optimize(Optimize.Deep),
      Doc.render({ style: "pretty" })
    )
  })

const renderSubmission = (
  nextState: State,
  options: Options
) =>
  Effect.gen(function*(_) {
    const terminal = yield* _(Terminal.Terminal)
    const figures = yield* _(InternalAnsiUtils.figures)
    const columns = yield* _(terminal.columns)
    const clearScreen = renderClearScreen(Option.some(nextState), options, columns)
    const leadingSymbol = Doc.annotate(figures.tick, Ansi.green)
    const trailingSymbol = Doc.annotate(figures.ellipsis, Ansi.blackBright)
    const promptMsg = renderOutput(nextState, leadingSymbol, trailingSymbol, options, true)
    return pipe(
      clearScreen,
      Doc.cat(promptMsg),
      Doc.cat(Doc.hardLine),
      Optimize.optimize(Optimize.Deep),
      Doc.render({ style: "pretty" })
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

const basePrompt = (
  options: Prompt.Prompt.TextOptions,
  type: Options["type"]
): Prompt.Prompt<string> => {
  const opts: Options = {
    default: "",
    type,
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

/** @internal */
export const hidden = (options: Prompt.Prompt.TextOptions): Prompt.Prompt<Secret.Secret> =>
  basePrompt(options, "hidden").pipe(InternalPrompt.map(Secret.fromString))

/** @internal */
export const password = (options: Prompt.Prompt.TextOptions): Prompt.Prompt<Secret.Secret> =>
  basePrompt(options, "password").pipe(InternalPrompt.map(Secret.fromString))

/** @internal */
export const text = (options: Prompt.Prompt.TextOptions): Prompt.Prompt<string> => basePrompt(options, "text")
