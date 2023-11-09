import type * as AnsiDoc from "@effect/printer-ansi/AnsiDoc"
import * as AnsiRender from "@effect/printer-ansi/AnsiRender"
import * as AnsiStyle from "@effect/printer-ansi/AnsiStyle"
import * as Color from "@effect/printer-ansi/Color"
import * as Doc from "@effect/printer/Doc"
import * as Optimize from "@effect/printer/Optimize"
import { Effect, pipe } from "effect"
import type * as Prompt from "../../Prompt.js"
import * as prompt from "../prompt.js"
import * as promptAction from "./action.js"
import * as ansiUtils from "./ansi-utils.js"

interface State {
  readonly cursor: number
  readonly offset: number
  readonly value: string
}

const renderBeep = AnsiRender.prettyDefault(ansiUtils.beep)

const renderError = (promptMsg: string, errorMsg: string, input: AnsiDoc.AnsiDoc, offset: number) =>
  Effect.map(ansiUtils.figures, ({ pointerSmall }) => {
    const doc = pipe(
      ansiUtils.resetLine,
      Doc.cat(Doc.annotate(Doc.text("?"), AnsiStyle.color(Color.cyan))),
      Doc.cat(Doc.space),
      Doc.cat(Doc.annotate(Doc.text(promptMsg), AnsiStyle.bold)),
      Doc.cat(Doc.space),
      Doc.cat(Doc.annotate(pointerSmall, AnsiStyle.color(Color.black))),
      Doc.cat(Doc.space),
      Doc.cat(Doc.annotate(input, AnsiStyle.color(Color.red))),
      Doc.cat(ansiUtils.cursorSave),
      Doc.cat(Doc.hardLine),
      Doc.cat(Doc.annotate(pointerSmall, AnsiStyle.color(Color.red))),
      Doc.cat(Doc.space),
      Doc.cat(Doc.annotate(
        Doc.text(errorMsg),
        AnsiStyle.combine(AnsiStyle.italicized, AnsiStyle.color(Color.red))
      )),
      Doc.cat(ansiUtils.cursorRestore),
      Doc.cat(ansiUtils.moveCursor(offset))
    )
    return AnsiRender.prettyDefault(Optimize.optimize(doc, Optimize.Deep))
  })

const renderNextFrame = (promptMsg: string, input: AnsiDoc.AnsiDoc, offset: number) =>
  Effect.map(ansiUtils.figures, ({ pointerSmall }) => {
    const doc = pipe(
      ansiUtils.resetDown,
      Doc.cat(Doc.annotate(Doc.text("?"), AnsiStyle.color(Color.cyan))),
      Doc.cat(Doc.space),
      Doc.cat(Doc.annotate(Doc.text(promptMsg), AnsiStyle.bold)),
      Doc.cat(Doc.space),
      Doc.cat(Doc.annotate(pointerSmall, AnsiStyle.color(Color.black))),
      Doc.cat(Doc.space),
      Doc.cat(
        Doc.annotate(input, AnsiStyle.combine(AnsiStyle.underlined, AnsiStyle.color(Color.green)))
      ),
      Doc.cat(ansiUtils.moveCursor(offset))
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

const renderInput = (
  value: string,
  type: NonNullable<Prompt.Prompt.TextOptions["type"]>
): AnsiDoc.AnsiDoc => {
  switch (type) {
    case "hidden": {
      return Doc.empty
    }
    case "password": {
      return Doc.text("*".repeat(value.length))
    }
    case "text": {
      return Doc.text(value)
    }
  }
}

const processBackspace = (currentState: State) => {
  if (currentState.cursor <= 0) {
    return Effect.succeed(promptAction.beep)
  }
  const beforeCursor = currentState.value.slice(0, currentState.cursor - 1)
  const afterCursor = currentState.value.slice(currentState.cursor)
  const cursor = currentState.cursor - 1
  const value = `${beforeCursor}${afterCursor}`
  return Effect.succeed(promptAction.nextFrame({ ...currentState, cursor, value }))
}

const processCursorLeft = (currentState: State) => {
  if (currentState.cursor <= 0) {
    return Effect.succeed(promptAction.beep)
  }
  const cursor = currentState.cursor - 1
  const offset = currentState.offset - 1
  return Effect.succeed(promptAction.nextFrame({ ...currentState, cursor, offset }))
}

const processCursorRight = (currentState: State) => {
  if (currentState.cursor >= currentState.value.length) {
    return Effect.succeed(promptAction.beep)
  }
  const cursor = Math.min(currentState.cursor + 1, currentState.value.length)
  const offset = Math.min(currentState.offset + 1, currentState.value.length)
  return Effect.succeed(promptAction.nextFrame({ ...currentState, cursor, offset }))
}

const defaultProcessor = (input: string, currentState: State) => {
  const beforeCursor = currentState.value.slice(0, currentState.cursor)
  const afterCursor = currentState.value.slice(currentState.cursor)
  const value = `${beforeCursor}${input}${afterCursor}`
  const cursor = beforeCursor.length + 1
  return Effect.succeed(promptAction.nextFrame({ ...currentState, cursor, value }))
}

const initialState: State = { cursor: 0, offset: 0, value: "" }

/** @internal */
export const text = (options: Prompt.Prompt.TextOptions): Prompt.Prompt<string> => {
  const opts: Required<Prompt.Prompt.TextOptions> = {
    default: "",
    type: "text",
    validate: Effect.succeed,
    ...options
  }
  return prompt.custom(
    initialState,
    (state, action) => {
      const input = renderInput(state.value, opts.type)
      switch (action._tag) {
        case "Beep": {
          return Effect.succeed(renderBeep)
        }
        case "Error": {
          return renderError(opts.message, action.message, input, state.offset)
        }
        case "NextFrame": {
          return renderNextFrame(opts.message, input, state.offset)
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
        case "CursorLeft": {
          return processCursorLeft(state)
        }
        case "CursorRight": {
          return processCursorRight(state)
        }
        case "Submit": {
          return Effect.match(opts.validate(state.value), {
            onFailure: promptAction.error,
            onSuccess: promptAction.submit
          })
        }
        default: {
          return defaultProcessor(input.value, state)
        }
      }
    }
  )
}
