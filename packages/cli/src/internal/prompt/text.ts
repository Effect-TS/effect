import * as Terminal from "@effect/platform/Terminal"
import * as Ansi from "@effect/printer-ansi/Ansi"
import * as Doc from "@effect/printer-ansi/AnsiDoc"
import * as Optimize from "@effect/printer/Optimize"
import * as Arr from "effect/Array"
import * as Effect from "effect/Effect"
import * as Option from "effect/Option"
import * as Redacted from "effect/Redacted"
import type * as Prompt from "../../Prompt.js"
import * as InternalPrompt from "../prompt.js"
import { Action } from "./action.js"
import * as InternalAnsiUtils from "./ansi-utils.js"

interface Options extends Required<Prompt.Prompt.TextOptions> {
  /**
   * The type of the text option.
   */
  readonly type: "hidden" | "password" | "text"
}

interface State {
  readonly cursor: number
  readonly value: string
  readonly error: Option.Option<string>
}

function getValue(state: State, options: Options): string {
  return state.value.length > 0 ? state.value : options.default
}

const renderBeep = Doc.render(Doc.beep, { style: "pretty" })

function renderClearScreen(state: State, options: Options) {
  return Effect.gen(function*() {
    const terminal = yield* Terminal.Terminal
    const columns = yield* terminal.columns
    // Erase the current line and place the cursor in column one
    const resetCurrentLine = Doc.cat(Doc.eraseLine, Doc.cursorLeft)
    // Check for any error output
    const clearError = Option.match(state.error, {
      onNone: () => Doc.empty,
      onSome: (error) =>
        // If there was an error, move the cursor down to the final error line and
        // then clear all lines of error output
        Doc.cursorDown(InternalAnsiUtils.lines(error, columns)).pipe(
          // Add a leading newline to the error message to ensure that the corrrect
          // number of error lines are erased
          Doc.cat(InternalAnsiUtils.eraseText(`\n${error}`, columns))
        )
    })
    // Ensure that the prior prompt output is cleaned up
    const clearOutput = InternalAnsiUtils.eraseText(options.message, columns)
    // Concatenate and render all documents
    return clearError.pipe(
      Doc.cat(clearOutput),
      Doc.cat(resetCurrentLine),
      Optimize.optimize(Optimize.Deep),
      Doc.render({ style: "pretty", options: { lineWidth: columns } })
    )
  })
}

function renderInput(nextState: State, options: Options, submitted: boolean) {
  const text = getValue(nextState, options)

  const annotation = Option.match(nextState.error, {
    onNone: () => {
      if (submitted) {
        return Ansi.white
      }

      if (nextState.value.length === 0) {
        return Ansi.blackBright
      }

      return Ansi.combine(Ansi.underlined, Ansi.cyanBright)
    },
    onSome: () => Ansi.red
  })

  switch (options.type) {
    case "hidden": {
      return Doc.empty
    }
    case "password": {
      return Doc.annotate(Doc.text("*".repeat(text.length)), annotation)
    }
    case "text": {
      return Doc.annotate(Doc.text(text), annotation)
    }
  }
}

function renderError(nextState: State, pointer: Doc.AnsiDoc) {
  return Option.match(nextState.error, {
    onNone: () => Doc.empty,
    onSome: (error) =>
      Arr.match(error.split(/\r?\n/), {
        onEmpty: () => Doc.empty,
        onNonEmpty: (errorLines) => {
          const annotateLine = (line: string): Doc.AnsiDoc =>
            Doc.text(line).pipe(
              Doc.annotate(Ansi.combine(Ansi.italicized, Ansi.red))
            )
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

function renderOutput(
  nextState: State,
  leadingSymbol: Doc.AnsiDoc,
  trailingSymbol: Doc.AnsiDoc,
  options: Options,
  submitted: boolean = false
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
      Doc.cat(renderInput(nextState, options, submitted))
    )
  }
  return Doc.hsep([prefix, trailingSymbol, renderInput(nextState, options, submitted)])
}

function renderNextFrame(state: State, options: Options) {
  return Effect.gen(function*() {
    const terminal = yield* Terminal.Terminal
    const columns = yield* terminal.columns
    const figures = yield* InternalAnsiUtils.figures
    const leadingSymbol = Doc.annotate(Doc.text("?"), Ansi.cyanBright)
    const trailingSymbol = Doc.annotate(figures.pointerSmall, Ansi.blackBright)
    const promptMsg = renderOutput(state, leadingSymbol, trailingSymbol, options)
    const errorMsg = renderError(state, figures.pointerSmall)
    const offset = state.cursor - state.value.length
    return promptMsg.pipe(
      Doc.cat(errorMsg),
      Doc.cat(Doc.cursorMove(offset)),
      Optimize.optimize(Optimize.Deep),
      Doc.render({ style: "pretty", options: { lineWidth: columns } })
    )
  })
}

function renderSubmission(state: State, options: Options) {
  return Effect.gen(function*() {
    const terminal = yield* Terminal.Terminal
    const columns = yield* terminal.columns
    const figures = yield* InternalAnsiUtils.figures
    const leadingSymbol = Doc.annotate(figures.tick, Ansi.green)
    const trailingSymbol = Doc.annotate(figures.ellipsis, Ansi.blackBright)
    const promptMsg = renderOutput(state, leadingSymbol, trailingSymbol, options, true)
    return promptMsg.pipe(
      Doc.cat(Doc.hardLine),
      Optimize.optimize(Optimize.Deep),
      Doc.render({ style: "pretty", options: { lineWidth: columns } })
    )
  })
}

function processBackspace(state: State) {
  if (state.cursor <= 0) {
    return Effect.succeed(Action.Beep())
  }
  const beforeCursor = state.value.slice(0, state.cursor - 1)
  const afterCursor = state.value.slice(state.cursor)
  const cursor = state.cursor - 1
  const value = `${beforeCursor}${afterCursor}`
  return Effect.succeed(
    Action.NextFrame({
      state: { ...state, cursor, value, error: Option.none() }
    })
  )
}

function processCursorLeft(state: State) {
  if (state.cursor <= 0) {
    return Effect.succeed(Action.Beep())
  }
  const cursor = state.cursor - 1
  return Effect.succeed(
    Action.NextFrame({
      state: { ...state, cursor, error: Option.none() }
    })
  )
}

function processCursorRight(state: State) {
  if (state.cursor >= state.value.length) {
    return Effect.succeed(Action.Beep())
  }
  const cursor = Math.min(state.cursor + 1, state.value.length)
  return Effect.succeed(
    Action.NextFrame({
      state: { ...state, cursor, error: Option.none() }
    })
  )
}

function processTab(state: State, options: Options) {
  if (state.value === options.default) {
    return Effect.succeed(Action.Beep())
  }
  const value = getValue(state, options)
  const cursor = value.length
  return Effect.succeed(
    Action.NextFrame({
      state: { ...state, value, cursor, error: Option.none() }
    })
  )
}

function defaultProcessor(input: string, state: State) {
  const beforeCursor = state.value.slice(0, state.cursor)
  const afterCursor = state.value.slice(state.cursor)
  const value = `${beforeCursor}${input}${afterCursor}`
  const cursor = state.cursor + input.length
  return Effect.succeed(
    Action.NextFrame({
      state: { ...state, cursor, value, error: Option.none() }
    })
  )
}

const initialState: State = {
  cursor: 0,
  value: "",
  error: Option.none()
}

function handleRender(options: Options) {
  return (state: State, action: Prompt.Prompt.Action<State, string>) => {
    return Action.$match(action, {
      Beep: () => Effect.succeed(renderBeep),
      NextFrame: ({ state }) => renderNextFrame(state, options),
      Submit: () => renderSubmission(state, options)
    })
  }
}

function handleProcess(options: Options) {
  return (input: Terminal.UserInput, state: State) => {
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
        const value = getValue(state, options)
        return Effect.match(options.validate(value), {
          onFailure: (error) =>
            Action.NextFrame({
              state: { ...state, value, error: Option.some(error) }
            }),
          onSuccess: (value) => Action.Submit({ value })
        })
      }
      case "tab": {
        return processTab(state, options)
      }
      default: {
        const value = Option.getOrElse(input.input, () => "")
        return defaultProcessor(value, state)
      }
    }
  }
}

function handleClear(options: Options) {
  return (state: State, _: Prompt.Prompt.Action<State, string>) => {
    return renderClearScreen(state, options)
  }
}

function basePrompt(
  options: Prompt.Prompt.TextOptions,
  type: Options["type"]
): Prompt.Prompt<string> {
  const opts: Options = {
    default: "",
    type,
    validate: Effect.succeed,
    ...options
  }

  return InternalPrompt.custom(initialState, {
    render: handleRender(opts),
    process: handleProcess(opts),
    clear: handleClear(opts)
  })
}

/** @internal */
export const hidden = (
  options: Prompt.Prompt.TextOptions
): Prompt.Prompt<Redacted.Redacted> => basePrompt(options, "hidden").pipe(InternalPrompt.map(Redacted.make))

/** @internal */
export const password = (
  options: Prompt.Prompt.TextOptions
): Prompt.Prompt<Redacted.Redacted> => basePrompt(options, "password").pipe(InternalPrompt.map(Redacted.make))

/** @internal */
export const text = (
  options: Prompt.Prompt.TextOptions
): Prompt.Prompt<string> => basePrompt(options, "text")
