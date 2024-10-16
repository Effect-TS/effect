import * as Terminal from "@effect/platform/Terminal"
import * as Ansi from "@effect/printer-ansi/Ansi"
import * as Doc from "@effect/printer-ansi/AnsiDoc"
import * as Optimize from "@effect/printer/Optimize"
import * as Arr from "effect/Array"
import * as Effect from "effect/Effect"
import * as EffectNumber from "effect/Number"
import * as Option from "effect/Option"
import * as Schema from "effect/Schema"
import type * as Prompt from "../../Prompt.js"
import * as InternalPrompt from "../prompt.js"
import { Action } from "./action.js"
import * as InternalAnsiUtils from "./ansi-utils.js"

interface IntegerOptions extends Required<Prompt.Prompt.IntegerOptions> {}
interface FloatOptions extends Required<Prompt.Prompt.FloatOptions> {}

interface State {
  readonly cursor: number
  readonly value: string
  readonly error: Option.Option<string>
}

const parseInt = Schema.NumberFromString.pipe(
  Schema.int(),
  Schema.decodeUnknown
)

const parseFloat = Schema.decodeUnknown(Schema.NumberFromString)

const renderBeep = Doc.render(Doc.beep, { style: "pretty" })

function handleClear(options: IntegerOptions) {
  return (state: State, _: Prompt.Prompt.Action<State, number>) => {
    return Effect.gen(function*() {
      const terminal = yield* Terminal.Terminal
      const columns = yield* terminal.columns
      const resetCurrentLine = Doc.cat(Doc.eraseLine, Doc.cursorLeft)
      const clearError = Option.match(state.error, {
        onNone: () => Doc.empty,
        onSome: (error) =>
          Doc.cursorDown(InternalAnsiUtils.lines(error, columns)).pipe(
            Doc.cat(InternalAnsiUtils.eraseText(`\n${error}`, columns))
          )
      })
      const clearOutput = InternalAnsiUtils.eraseText(options.message, columns)
      return clearError.pipe(
        Doc.cat(clearOutput),
        Doc.cat(resetCurrentLine),
        Optimize.optimize(Optimize.Deep),
        Doc.render({ style: "pretty", options: { lineWidth: columns } })
      )
    })
  }
}

function renderInput(state: State, submitted: boolean) {
  const annotation = Option.match(state.error, {
    onNone: () => Ansi.combine(Ansi.underlined, Ansi.cyanBright),
    onSome: () => Ansi.red
  })
  const value = state.value === "" ? Doc.empty : Doc.text(`${state.value}`)
  return submitted ? value : Doc.annotate(value, annotation)
}

const NEWLINE_REGEX = /\r?\n/

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

function renderOutput(
  state: State,
  leadingSymbol: Doc.AnsiDoc,
  trailingSymbol: Doc.AnsiDoc,
  options: IntegerOptions,
  submitted: boolean = false
) {
  const annotateLine = (line: string): Doc.AnsiDoc => Doc.annotate(Doc.text(line), Ansi.bold)
  const prefix = Doc.cat(leadingSymbol, Doc.space)
  return Arr.match(options.message.split(/\r?\n/), {
    onEmpty: () => Doc.hsep([prefix, trailingSymbol, renderInput(state, submitted)]),
    onNonEmpty: (promptLines) => {
      const lines = Arr.map(promptLines, (line) => annotateLine(line))
      return prefix.pipe(
        Doc.cat(Doc.nest(Doc.vsep(lines), 2)),
        Doc.cat(Doc.space),
        Doc.cat(trailingSymbol),
        Doc.cat(Doc.space),
        Doc.cat(renderInput(state, submitted))
      )
    }
  })
}

function renderNextFrame(state: State, options: IntegerOptions) {
  return Effect.gen(function*() {
    const terminal = yield* Terminal.Terminal
    const columns = yield* terminal.columns
    const figures = yield* InternalAnsiUtils.figures
    const leadingSymbol = Doc.annotate(Doc.text("?"), Ansi.cyanBright)
    const trailingSymbol = Doc.annotate(figures.pointerSmall, Ansi.blackBright)
    const errorMsg = renderError(state, figures.pointerSmall)
    const promptMsg = renderOutput(state, leadingSymbol, trailingSymbol, options)
    return promptMsg.pipe(
      Doc.cat(errorMsg),
      Optimize.optimize(Optimize.Deep),
      Doc.render({ style: "pretty", options: { lineWidth: columns } })
    )
  })
}

function renderSubmission(nextState: State, options: IntegerOptions) {
  return Effect.gen(function*() {
    const terminal = yield* Terminal.Terminal
    const columns = yield* terminal.columns
    const figures = yield* InternalAnsiUtils.figures
    const leadingSymbol = Doc.annotate(figures.tick, Ansi.green)
    const trailingSymbol = Doc.annotate(figures.ellipsis, Ansi.blackBright)
    const promptMsg = renderOutput(nextState, leadingSymbol, trailingSymbol, options, true)
    return promptMsg.pipe(
      Doc.cat(Doc.hardLine),
      Optimize.optimize(Optimize.Deep),
      Doc.render({ style: "pretty", options: { lineWidth: columns } })
    )
  })
}

function processBackspace(state: State) {
  if (state.value.length <= 0) {
    return Effect.succeed(Action.Beep())
  }
  const value = state.value.slice(0, state.value.length - 1)
  return Effect.succeed(Action.NextFrame({
    state: { ...state, value, error: Option.none() }
  }))
}

function defaultIntProcessor(state: State, input: string) {
  if (state.value.length === 0 && input === "-") {
    return Effect.succeed(Action.NextFrame({
      state: { ...state, value: "-", error: Option.none() }
    }))
  }
  return Effect.match(parseInt(state.value + input), {
    onFailure: () => Action.Beep(),
    onSuccess: (value) =>
      Action.NextFrame({
        state: { ...state, value: `${value}`, error: Option.none() }
      })
  })
}

function defaultFloatProcessor(
  state: State,
  input: string
) {
  if (input === "." && state.value.includes(".")) {
    return Effect.succeed(Action.Beep())
  }
  if (state.value.length === 0 && input === "-") {
    return Effect.succeed(Action.NextFrame({
      state: { ...state, value: "-", error: Option.none() }
    }))
  }
  return Effect.match(parseFloat(state.value + input), {
    onFailure: () => Action.Beep(),
    onSuccess: (value) =>
      Action.NextFrame({
        state: {
          ...state,
          value: input === "." ? `${value}.` : `${value}`,
          error: Option.none()
        }
      })
  })
}

const initialState: State = {
  cursor: 0,
  value: "",
  error: Option.none()
}

function handleRenderInteger(options: IntegerOptions) {
  return (state: State, action: Prompt.Prompt.Action<State, Number>) => {
    return Action.$match(action, {
      Beep: () => Effect.succeed(renderBeep),
      NextFrame: ({ state }) => renderNextFrame(state, options),
      Submit: () => renderSubmission(state, options)
    })
  }
}

function handleProcessInteger(options: IntegerOptions) {
  return (input: Terminal.UserInput, state: State) => {
    switch (input.key.name) {
      case "backspace": {
        return processBackspace(state)
      }
      case "k":
      case "up": {
        return Effect.succeed(Action.NextFrame({
          state: {
            ...state,
            value: state.value === "" || state.value === "-"
              ? `${options.incrementBy}`
              : `${Number.parseInt(state.value) + options.incrementBy}`,
            error: Option.none()
          }
        }))
      }
      case "j":
      case "down": {
        return Effect.succeed(Action.NextFrame({
          state: {
            ...state,
            value: state.value === "" || state.value === "-"
              ? `-${options.decrementBy}`
              : `${Number.parseInt(state.value) - options.decrementBy}`,
            error: Option.none()
          }
        }))
      }
      case "enter":
      case "return": {
        return Effect.matchEffect(parseInt(state.value), {
          onFailure: () =>
            Effect.succeed(Action.NextFrame({
              state: {
                ...state,
                error: Option.some("Must provide an integer value")
              }
            })),
          onSuccess: (n) =>
            Effect.match(options.validate(n), {
              onFailure: (error) =>
                Action.NextFrame({
                  state: {
                    ...state,
                    error: Option.some(error)
                  }
                }),
              onSuccess: (value) => Action.Submit({ value })
            })
        })
      }
      default: {
        const value = Option.getOrElse(input.input, () => "")
        return defaultIntProcessor(state, value)
      }
    }
  }
}

/** @internal */
export const integer = (options: Prompt.Prompt.IntegerOptions): Prompt.Prompt<number> => {
  const opts: IntegerOptions = {
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
  return InternalPrompt.custom(initialState, {
    render: handleRenderInteger(opts),
    process: handleProcessInteger(opts),
    clear: handleClear(opts)
  })
}

function handleRenderFloat(options: FloatOptions) {
  return (state: State, action: Prompt.Prompt.Action<State, number>) => {
    return Action.$match(action, {
      Beep: () => Effect.succeed(renderBeep),
      NextFrame: ({ state }) => renderNextFrame(state, options),
      Submit: () => renderSubmission(state, options)
    })
  }
}

function handleProcessFloat(options: FloatOptions) {
  return (input: Terminal.UserInput, state: State) => {
    switch (input.key.name) {
      case "backspace": {
        return processBackspace(state)
      }
      case "k":
      case "up": {
        return Effect.succeed(Action.NextFrame({
          state: {
            ...state,
            value: state.value === "" || state.value === "-"
              ? `${options.incrementBy}`
              : `${Number.parseFloat(state.value) + options.incrementBy}`,
            error: Option.none()
          }
        }))
      }
      case "j":
      case "down": {
        return Effect.succeed(Action.NextFrame({
          state: {
            ...state,
            value: state.value === "" || state.value === "-"
              ? `-${options.decrementBy}`
              : `${Number.parseFloat(state.value) - options.decrementBy}`,
            error: Option.none()
          }
        }))
      }
      case "enter":
      case "return": {
        return Effect.matchEffect(parseFloat(state.value), {
          onFailure: () =>
            Effect.succeed(Action.NextFrame({
              state: {
                ...state,
                error: Option.some("Must provide a floating point value")
              }
            })),
          onSuccess: (n) =>
            Effect.flatMap(
              Effect.sync(() => EffectNumber.round(n, options.precision)),
              (rounded) =>
                Effect.match(options.validate(rounded), {
                  onFailure: (error) =>
                    Action.NextFrame({
                      state: {
                        ...state,
                        error: Option.some(error)
                      }
                    }),
                  onSuccess: (value) => Action.Submit({ value })
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
}

/** @internal */
export const float = (options: Prompt.Prompt.FloatOptions): Prompt.Prompt<number> => {
  const opts: FloatOptions = {
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
  return InternalPrompt.custom(initialState, {
    render: handleRenderFloat(opts),
    process: handleProcessFloat(opts),
    clear: handleClear(opts)
  })
}
