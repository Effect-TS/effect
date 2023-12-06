import * as Terminal from "@effect/platform/Terminal"
import * as Ansi from "@effect/printer-ansi/Ansi"
import * as Doc from "@effect/printer-ansi/AnsiDoc"
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

const renderBeep = Doc.render(Doc.beep, { style: "pretty" })

const renderClearScreen = (
  prevState: Option.Option<State>,
  options: Required<Prompt.Prompt.IntegerOptions>,
  columns: number
): Doc.AnsiDoc => {
  const resetCurrentLine = Doc.cat(Doc.eraseLine, Doc.cursorLeft)
  if (Option.isNone(prevState)) {
    return resetCurrentLine
  }
  const clearError = Option.match(prevState.value.error, {
    onNone: () => Doc.empty,
    onSome: (error) =>
      pipe(
        Doc.cursorDown(InternalAnsiUtils.lines(error, columns)),
        Doc.cat(InternalAnsiUtils.eraseText(`\n${error}`, columns))
      )
  })
  const clearOutput = InternalAnsiUtils.eraseText(options.message, columns)
  return Doc.cat(clearError, Doc.cat(clearOutput, resetCurrentLine))
}

const renderInput = (nextState: State, submitted: boolean): Doc.AnsiDoc => {
  const annotation = Option.match(nextState.error, {
    onNone: () => Ansi.combine(Ansi.underlined, Ansi.cyanBright),
    onSome: () => Ansi.red
  })
  const value = nextState.value === "" ? Doc.empty : Doc.text(`${nextState.value}`)
  return submitted ? value : Doc.annotate(value, annotation)
}

const renderError = (nextState: State, pointer: Doc.AnsiDoc): Doc.AnsiDoc =>
  Option.match(nextState.error, {
    onNone: () => Doc.empty,
    onSome: (error) =>
      ReadonlyArray.match(error.split(/\r?\n/), {
        onEmpty: () => Doc.empty,
        onNonEmpty: (errorLines) => {
          const annotateLine = (line: string): Doc.AnsiDoc =>
            Doc.annotate(Doc.text(line), Ansi.combine(Ansi.italicized, Ansi.red))
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
  options: Required<Prompt.Prompt.IntegerOptions>,
  submitted: boolean = false
): Doc.AnsiDoc => {
  const annotateLine = (line: string): Doc.AnsiDoc => Doc.annotate(Doc.text(line), Ansi.bold)
  const prefix = Doc.cat(leadingSymbol, Doc.space)
  return ReadonlyArray.match(options.message.split(/\r?\n/), {
    onEmpty: () => Doc.hsep([prefix, trailingSymbol, renderInput(nextState, submitted)]),
    onNonEmpty: (promptLines) => {
      const lines = ReadonlyArray.map(promptLines, (line) => annotateLine(line))
      return pipe(
        prefix,
        Doc.cat(Doc.nest(Doc.vsep(lines), 2)),
        Doc.cat(Doc.space),
        Doc.cat(trailingSymbol),
        Doc.cat(Doc.space),
        Doc.cat(renderInput(nextState, submitted))
      )
    }
  })
}

const renderNextFrame = (
  prevState: Option.Option<State>,
  nextState: State,
  options: Required<Prompt.Prompt.IntegerOptions>
) =>
  Effect.gen(function*(_) {
    const terminal = yield* _(Terminal.Terminal)
    const figures = yield* _(InternalAnsiUtils.figures)
    const columns = yield* _(terminal.columns)
    const leadingSymbol = Doc.annotate(Doc.text("?"), Ansi.cyanBright)
    const trailingSymbol = Doc.annotate(figures.pointerSmall, Ansi.blackBright)
    const clearScreen = renderClearScreen(prevState, options, columns)
    const errorMsg = renderError(nextState, figures.pointerSmall)
    const promptMsg = renderOutput(nextState, leadingSymbol, trailingSymbol, options)
    return pipe(
      clearScreen,
      Doc.cat(promptMsg),
      Doc.cat(errorMsg),
      Optimize.optimize(Optimize.Deep),
      Doc.render({ style: "pretty" })
    )
  })

const renderSubmission = (
  nextState: State,
  options: Required<Prompt.Prompt.IntegerOptions>
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
