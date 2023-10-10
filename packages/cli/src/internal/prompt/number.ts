import * as prompt from "@effect/cli/internal/prompt"
import * as promptAction from "@effect/cli/internal/prompt/action"
import * as ansiUtils from "@effect/cli/internal/prompt/ansi-utils"
import type * as Prompt from "@effect/cli/Prompt"
import type * as PromptAction from "@effect/cli/Prompt/Action"
import type * as AnsiDoc from "@effect/printer-ansi/AnsiDoc"
import * as AnsiRender from "@effect/printer-ansi/AnsiRender"
import * as AnsiStyle from "@effect/printer-ansi/AnsiStyle"
import * as Color from "@effect/printer-ansi/Color"
import * as Doc from "@effect/printer/Doc"
import * as Optimize from "@effect/printer/Optimize"
import { Effect, pipe } from "effect"

interface State {
  readonly cursor: number
  readonly value: string
}

const round = (number: number, precision: number) => {
  const factor = Math.pow(10, precision)
  return Math.round(number * factor) / factor
}

const parseInt = (value: string): Effect.Effect<never, void, number> =>
  Effect.suspend(() => {
    const parsed = Number.parseInt(value)
    if (Number.isNaN(parsed)) {
      return Effect.fail(void 0)
    }
    return Effect.succeed(parsed)
  })

const parseFloat = (value: string): Effect.Effect<never, void, number> =>
  Effect.suspend(() => {
    const parsed = Number.parseFloat(value)
    if (Number.isNaN(parsed)) {
      return Effect.fail(void 0)
    }
    return Effect.succeed(parsed)
  })

const renderBeep = AnsiRender.prettyDefault(ansiUtils.beep)

const renderError = (promptMsg: string, errorMsg: string, input: AnsiDoc.AnsiDoc) =>
  Effect.map(ansiUtils.figures, ({ pointerSmall }) => {
    const doc = pipe(
      ansiUtils.resetLine,
      Doc.cat(Doc.annotate(Doc.text("?"), AnsiStyle.color(Color.cyan))),
      Doc.cat(Doc.space),
      Doc.cat(Doc.annotate(Doc.text(promptMsg), AnsiStyle.bold)),
      Doc.cat(Doc.space),
      Doc.cat(Doc.annotate(pointerSmall, AnsiStyle.color(Color.black))),
      Doc.cat(Doc.space),
      Doc.cat(Doc.annotate(input, AnsiStyle.combine(AnsiStyle.underlined, AnsiStyle.color(Color.red)))),
      Doc.cat(ansiUtils.cursorSave),
      Doc.cat(Doc.hardLine),
      Doc.cat(Doc.annotate(pointerSmall, AnsiStyle.color(Color.red))),
      Doc.cat(Doc.space),
      Doc.cat(Doc.annotate(
        Doc.text(errorMsg),
        AnsiStyle.combine(AnsiStyle.italicized, AnsiStyle.color(Color.red))
      )),
      Doc.cat(ansiUtils.cursorRestore)
    )
    return AnsiRender.prettyDefault(Optimize.optimize(doc, Optimize.Deep))
  })

const renderNextFrame = (promptMsg: string, input: AnsiDoc.AnsiDoc) =>
  Effect.map(ansiUtils.figures, ({ pointerSmall }) => {
    const doc = pipe(
      ansiUtils.resetDown,
      Doc.cat(Doc.annotate(Doc.text("?"), AnsiStyle.color(Color.cyan))),
      Doc.cat(Doc.space),
      Doc.cat(Doc.annotate(Doc.text(promptMsg), AnsiStyle.bold)),
      Doc.cat(Doc.space),
      Doc.cat(Doc.annotate(pointerSmall, AnsiStyle.color(Color.black))),
      Doc.cat(Doc.space),
      Doc.cat(Doc.annotate(input, AnsiStyle.combine(AnsiStyle.underlined, AnsiStyle.color(Color.green))))
    )
    return AnsiRender.prettyDefault(Optimize.optimize(doc, Optimize.Deep))
  })

const renderSubmission = (promptMsg: string, input: AnsiDoc.AnsiDoc) =>
  Effect.map(ansiUtils.figures, ({ ellipsis, tick }) => {
    const doc = pipe(
      ansiUtils.resetDown,
      Doc.cat(Doc.annotate(tick, AnsiStyle.color(Color.green))),
      Doc.cat(Doc.space),
      Doc.cat(Doc.annotate(Doc.text(promptMsg), AnsiStyle.bold)),
      Doc.cat(Doc.space),
      Doc.cat(Doc.annotate(ellipsis, AnsiStyle.color(Color.black))),
      Doc.cat(Doc.space),
      Doc.cat(Doc.annotate(input, AnsiStyle.color(Color.white))),
      Doc.cat(Doc.hardLine)
    )
    return AnsiRender.prettyDefault(Optimize.optimize(doc, Optimize.Deep))
  })

const processBackspace = (currentState: State) => {
  if (currentState.value.length <= 0) {
    return Effect.succeed(promptAction.beep)
  }
  return Effect.succeed(promptAction.nextFrame({
    ...currentState,
    value: currentState.value.slice(0, currentState.value.length - 1)
  }))
}

const defaultIntProcessor = (
  currentState: State,
  input: string
): Effect.Effect<never, never, PromptAction.PromptAction<State, number>> => {
  if (currentState.value.length === 0 && input === "-") {
    return Effect.succeed(promptAction.nextFrame({ ...currentState, value: "-" }))
  }
  return Effect.match(parseInt(currentState.value + input), {
    onFailure: () => promptAction.beep,
    onSuccess: (value) => promptAction.nextFrame({ ...currentState, value: `${value}` })
  })
}

const defaultFloatProcessor = (
  currentState: State,
  input: string
): Effect.Effect<never, never, PromptAction.PromptAction<State, number>> => {
  if (input === "." && currentState.value.includes(".")) {
    return Effect.succeed(promptAction.beep)
  }
  if (currentState.value.length === 0 && input === "-") {
    return Effect.succeed(promptAction.nextFrame({ ...currentState, value: "-" }))
  }
  return Effect.match(parseFloat(currentState.value + input), {
    onFailure: () => promptAction.beep,
    onSuccess: (value) =>
      promptAction.nextFrame({
        ...currentState,
        value: input === "." ? `${value}.` : `${value}`
      })
  })
}

const initialState: State = { cursor: 0, value: "" }

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
  return prompt.custom(
    initialState,
    (state, action) => {
      const input = state.value === "" ? Doc.empty : Doc.text(`${state.value}`)
      switch (action._tag) {
        case "Beep": {
          return Effect.succeed(renderBeep)
        }
        case "Error": {
          return renderError(opts.message, action.message, input)
        }
        case "NextFrame": {
          return renderNextFrame(opts.message, input)
        }
        case "Submit": {
          return renderSubmission(opts.message, input)
        }
      }
    },
    (input, state) => {
      switch (input.action) {
        case "Backspace": {
          return processBackspace(state)
        }
        case "CursorUp": {
          return Effect.sync(() =>
            promptAction.nextFrame({
              ...state,
              value: state.value === "" || state.value === "-"
                ? `${opts.incrementBy}`
                : `${Number.parseInt(state.value) + opts.incrementBy}`
            })
          )
        }
        case "CursorDown": {
          return Effect.sync(() =>
            promptAction.nextFrame({
              ...state,
              value: state.value === "" || state.value === "-"
                ? `-${opts.decrementBy}`
                : `${Number.parseInt(state.value) - opts.decrementBy}`
            })
          )
        }
        case "Submit": {
          return Effect.matchEffect(parseInt(state.value), {
            onFailure: () => Effect.succeed(promptAction.error("Must provide an integer value")),
            onSuccess: (n) =>
              Effect.match(opts.validate(n), {
                onFailure: promptAction.error,
                onSuccess: promptAction.submit
              })
          })
        }
        default: {
          return defaultIntProcessor(state, input.value)
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
  return prompt.custom(
    initialState,
    (state, action) => {
      const input = state.value === "" ? Doc.empty : Doc.text(`${state.value}`)
      switch (action._tag) {
        case "Beep": {
          return Effect.succeed(renderBeep)
        }
        case "Error": {
          return renderError(opts.message, action.message, input)
        }
        case "NextFrame": {
          return renderNextFrame(opts.message, input)
        }
        case "Submit": {
          return renderSubmission(opts.message, input)
        }
      }
    },
    (input, state) => {
      switch (input.action) {
        case "Backspace": {
          return processBackspace(state)
        }
        case "CursorUp": {
          return Effect.sync(() =>
            promptAction.nextFrame({
              ...state,
              value: state.value === "" || state.value === "-"
                ? `${opts.incrementBy}`
                : `${Number.parseFloat(state.value) + opts.incrementBy}`
            })
          )
        }
        case "CursorDown": {
          return Effect.sync(() =>
            promptAction.nextFrame({
              ...state,
              value: state.value === "" || state.value === "-"
                ? `-${opts.decrementBy}`
                : `${Number.parseFloat(state.value) - opts.decrementBy}`
            })
          )
        }
        case "Submit": {
          return Effect.matchEffect(parseFloat(state.value), {
            onFailure: () => Effect.succeed(promptAction.error("Must provide a floating point value")),
            onSuccess: (n) =>
              Effect.flatMap(
                Effect.sync(() => round(n, opts.precision)),
                (rounded) =>
                  Effect.match(opts.validate(rounded), {
                    onFailure: promptAction.error,
                    onSuccess: promptAction.submit
                  })
              )
          })
        }
        default: {
          return defaultFloatProcessor(state, input.value)
        }
      }
    }
  )
}
