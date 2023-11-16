import * as Terminal from "@effect/platform/Terminal"
import type * as AnsiDoc from "@effect/printer-ansi/AnsiDoc"
import * as AnsiRender from "@effect/printer-ansi/AnsiRender"
import * as AnsiStyle from "@effect/printer-ansi/AnsiStyle"
import * as Color from "@effect/printer-ansi/Color"
import * as Doc from "@effect/printer/Doc"
import * as Optimize from "@effect/printer/Optimize"
import * as Schema from "@effect/schema/Schema"
import * as Effect from "effect/Effect"
import { pipe } from "effect/Function"
import * as Option from "effect/Option"
import * as ReadonlyArray from "effect/ReadonlyArray"
import type * as Prompt from "../../Prompt.js"
import type * as PromptAction from "../../Prompt/Action.js"
import * as InternalPrompt from "../prompt.js"
import * as InternalPromptAction from "./action.js"
import * as InternalAnsiUtils from "./ansi-utils.js"

interface State {
  readonly cursor: number
  readonly value: string
  readonly error: Option.Option<string>
}

const round = (number: number, precision: number) => {
  const factor = Math.pow(10, precision)
  return Math.round(number * factor) / factor
}

const parseInt = Schema.NumberFromString.pipe(
  Schema.int(),
  Schema.parse
)

const parseFloat = Schema.parse(Schema.NumberFromString)

const renderBeep = AnsiRender.prettyDefault(InternalAnsiUtils.beep)

const renderClearScreen = (
  prevState: Option.Option<State>,
  options: Required<Prompt.Prompt.IntegerOptions>,
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

const renderInput = (nextState: State): AnsiDoc.AnsiDoc => {
  const annotation = Option.match(nextState.error, {
    onNone: () => AnsiStyle.combine(AnsiStyle.underlined, AnsiStyle.color(Color.green)),
    onSome: () => AnsiStyle.color(Color.red)
  })
  const value = nextState.value === "" ? Doc.empty : Doc.text(`${nextState.value}`)
  return Doc.annotate(value, annotation)
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
  options: Required<Prompt.Prompt.IntegerOptions>
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
      Doc.cat(renderInput(nextState))
    )
  }
  return Doc.hsep([prefix, trailingSymbol, renderInput(nextState)])
}

const renderNextFrame = (
  prevState: Option.Option<State>,
  nextState: State,
  options: Required<Prompt.Prompt.IntegerOptions>
) =>
  Effect.gen(function*(_) {
    const terminal = yield* _(Terminal.Terminal)
    const figures = yield* _(InternalAnsiUtils.figures)
    const leadingSymbol = Doc.annotate(Doc.text("?"), AnsiStyle.color(Color.cyan))
    const trailingSymbol = Doc.annotate(figures.pointerSmall, AnsiStyle.color(Color.black))
    const clearScreen = renderClearScreen(prevState, options, terminal.columns)
    const errorMsg = renderError(nextState, figures.pointerSmall)
    const promptMsg = renderOutput(nextState, leadingSymbol, trailingSymbol, options)
    return pipe(
      clearScreen,
      Doc.cat(promptMsg),
      Doc.cat(errorMsg),
      Optimize.optimize(Optimize.Deep),
      AnsiRender.prettyDefault
    )
  })

const renderSubmission = (
  nextState: State,
  options: Required<Prompt.Prompt.IntegerOptions>
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
  if (currentState.value.length <= 0) {
    return Effect.succeed(InternalPromptAction.beep)
  }
  return Effect.succeed(InternalPromptAction.nextFrame({
    ...currentState,
    value: currentState.value.slice(0, currentState.value.length - 1),
    error: Option.none()
  }))
}

const defaultIntProcessor = (
  currentState: State,
  input: string
): Effect.Effect<never, never, PromptAction.PromptAction<State, number>> => {
  if (currentState.value.length === 0 && input === "-") {
    return Effect.succeed(InternalPromptAction.nextFrame({
      ...currentState,
      value: "-",
      error: Option.none()
    }))
  }
  return Effect.match(parseInt(currentState.value + input), {
    onFailure: () => InternalPromptAction.beep,
    onSuccess: (value) =>
      InternalPromptAction.nextFrame({
        ...currentState,
        value: `${value}`,
        error: Option.none()
      })
  })
}

const defaultFloatProcessor = (
  currentState: State,
  input: string
): Effect.Effect<never, never, PromptAction.PromptAction<State, number>> => {
  if (input === "." && currentState.value.includes(".")) {
    return Effect.succeed(InternalPromptAction.beep)
  }
  if (currentState.value.length === 0 && input === "-") {
    return Effect.succeed(InternalPromptAction.nextFrame({
      ...currentState,
      value: "-",
      error: Option.none()
    }))
  }
  return Effect.match(parseFloat(currentState.value + input), {
    onFailure: () => InternalPromptAction.beep,
    onSuccess: (value) =>
      InternalPromptAction.nextFrame({
        ...currentState,
        value: input === "." ? `${value}.` : `${value}`,
        error: Option.none()
      })
  })
}

const initialState: State = {
  cursor: 0,
  value: "",
  error: Option.none()
}

/** @internal */
export const integer = (options: Prompt.Prompt.IntegerOptions): Prompt.Prompt<number> => {
  const opts: Required<Prompt.Prompt.IntegerOptions> = {
    min: Number.NEGATIVE_INFINITY,
    max: Number.POSITIVE_INFINITY,
    incrementBy: 1,
    decrementBy: 1,
    validate: (n) => {
      if (n < opts.min) {
        return Effect.fail(`${n} must be greater than or equal to ${opts.min}`)
      }
      if (n > opts.max) {
        return Effect.fail(`${n} must be less than or equal to ${opts.max}`)
      }
      return Effect.succeed(n)
    },
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
        case "k":
        case "up": {
          return Effect.sync(() =>
            InternalPromptAction.nextFrame({
              ...state,
              value: state.value === "" || state.value === "-"
                ? `${opts.incrementBy}`
                : `${Number.parseInt(state.value) + opts.incrementBy}`,
              error: Option.none()
            })
          )
        }
        case "j":
        case "down": {
          return Effect.sync(() =>
            InternalPromptAction.nextFrame({
              ...state,
              value: state.value === "" || state.value === "-"
                ? `-${opts.decrementBy}`
                : `${Number.parseInt(state.value) - opts.decrementBy}`,
              error: Option.none()
            })
          )
        }
        case "enter":
        case "return": {
          return Effect.matchEffect(parseInt(state.value), {
            onFailure: () =>
              Effect.succeed(InternalPromptAction.nextFrame({
                ...state,
                error: Option.some("Must provide an integer value")
              })),
            onSuccess: (n) =>
              Effect.match(opts.validate(n), {
                onFailure: (error) =>
                  InternalPromptAction.nextFrame({
                    ...state,
                    error: Option.some(error)
                  }),
                onSuccess: InternalPromptAction.submit
              })
          })
        }
        default: {
          const value = Option.getOrElse(input.input, () => "")
          return defaultIntProcessor(state, value)
        }
      }
    }
  )
}

/** @internal */
export const float = (options: Prompt.Prompt.FloatOptions): Prompt.Prompt<number> => {
  const opts: Required<Prompt.Prompt.FloatOptions> = {
    min: Number.NEGATIVE_INFINITY,
    max: Number.POSITIVE_INFINITY,
    incrementBy: 1,
    decrementBy: 1,
    precision: 2,
    validate: (n) => {
      if (n < opts.min) {
        return Effect.fail(`${n} must be greater than or equal to ${opts.min}`)
      }
      if (n > opts.max) {
        return Effect.fail(`${n} must be less than or equal to ${opts.max}`)
      }
      return Effect.succeed(n)
    },
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
        case "k":
        case "up": {
          return Effect.sync(() =>
            InternalPromptAction.nextFrame({
              ...state,
              value: state.value === "" || state.value === "-"
                ? `${opts.incrementBy}`
                : `${Number.parseFloat(state.value) + opts.incrementBy}`,
              error: Option.none()
            })
          )
        }
        case "j":
        case "down": {
          return Effect.sync(() =>
            InternalPromptAction.nextFrame({
              ...state,
              value: state.value === "" || state.value === "-"
                ? `-${opts.decrementBy}`
                : `${Number.parseFloat(state.value) - opts.decrementBy}`,
              error: Option.none()
            })
          )
        }
        case "enter":
        case "return": {
          return Effect.matchEffect(parseFloat(state.value), {
            onFailure: () =>
              Effect.succeed(InternalPromptAction.nextFrame({
                ...state,
                error: Option.some("Must provide a floating point value")
              })),
            onSuccess: (n) =>
              Effect.flatMap(
                Effect.sync(() => round(n, opts.precision)),
                (rounded) =>
                  Effect.match(opts.validate(rounded), {
                    onFailure: (error) =>
                      InternalPromptAction.nextFrame({
                        ...state,
                        error: Option.some(error)
                      }),
                    onSuccess: InternalPromptAction.submit
                  })
              )
          })
        }
        default: {
          const value = Option.getOrElse(input.input, () => "")
          return defaultFloatProcessor(state, value)
        }
      }
    }
  )
}
