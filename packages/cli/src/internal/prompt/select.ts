import * as AnsiRender from "@effect/printer-ansi/AnsiRender"
import * as AnsiStyle from "@effect/printer-ansi/AnsiStyle"
import * as Color from "@effect/printer-ansi/Color"
import * as Doc from "@effect/printer/Doc"
import * as Optimize from "@effect/printer/Optimize"
import { Effect, pipe } from "effect"
import type * as Prompt from "../../Prompt"
import * as prompt from "../prompt"
import * as promptAction from "./action"
import * as ansiUtils from "./ansi-utils"
import * as utils from "./utils"

interface State {
  readonly cursor: number
}

const renderBeep = AnsiRender.prettyDefault(ansiUtils.beep)

const renderChoices = (state: State, choices: Prompt.Prompt.SelectOptions["choices"], pointer: Doc.Doc<never>) => {
  const { endIndex, startIndex } = utils.displayRange(state.cursor, choices.length)
  const choicesToRender = choices.slice(startIndex, endIndex)
  const selectedStyle = AnsiStyle.combine(AnsiStyle.underlined, AnsiStyle.color(Color.green))
  const docs = choicesToRender.map(({ description, title }, index) => {
    const isSelected = state.cursor === index
    const prefix = isSelected ? Doc.annotate(pointer, AnsiStyle.color(Color.green)) : Doc.space
    const doc = isSelected ? Doc.annotate(Doc.text(title), selectedStyle) : Doc.text(title)
    if (description !== undefined && isSelected) {
      const desc = pipe(
        Doc.char("-"),
        Doc.cat(Doc.space),
        Doc.cat(Doc.text(description)),
        Doc.annotate(AnsiStyle.color(Color.black))
      )
      return pipe(
        prefix,
        Doc.cat(Doc.space),
        Doc.cat(doc),
        Doc.cat(Doc.space),
        Doc.cat(desc)
      )
    }
    return pipe(
      prefix,
      Doc.cat(Doc.space),
      Doc.cat(doc)
    )
  })
  return Doc.vsep(docs)
}

const renderNextFrame = (promptMsg: string, state: State, choices: Prompt.Prompt.SelectOptions["choices"]) =>
  Effect.map(ansiUtils.figures, ({ pointer, pointerSmall }) => {
    const renderedChoices = renderChoices(state, choices, pointer)
    const doc = pipe(
      ansiUtils.setCursorPosition(0),
      Doc.cat(ansiUtils.clearLines(choices.length + 1)),
      Doc.cat(ansiUtils.cursorHide),
      Doc.cat(Doc.annotate(Doc.text("?"), AnsiStyle.color(Color.cyan))),
      Doc.cat(Doc.space),
      Doc.cat(Doc.annotate(Doc.text(promptMsg), AnsiStyle.bold)),
      Doc.cat(Doc.space),
      Doc.cat(Doc.annotate(pointerSmall, AnsiStyle.color(Color.black))),
      Doc.cat(Doc.hardLine),
      Doc.cat(renderedChoices)
    )
    return AnsiRender.prettyDefault(Optimize.optimize(doc, Optimize.Deep))
  })

const renderSubmission = (promptMsg: string, state: State, choices: Prompt.Prompt.SelectOptions["choices"]) =>
  Effect.map(ansiUtils.figures, ({ ellipsis, tick }) => {
    const selected = Doc.text(choices[state.cursor].title)
    const doc = pipe(
      ansiUtils.setCursorPosition(0),
      Doc.cat(ansiUtils.clearLines(choices.length + 1)),
      Doc.cat(Doc.annotate(tick, AnsiStyle.color(Color.green))),
      Doc.cat(Doc.space),
      Doc.cat(Doc.annotate(Doc.text(promptMsg), AnsiStyle.bold)),
      Doc.cat(Doc.space),
      Doc.cat(Doc.annotate(ellipsis, AnsiStyle.color(Color.black))),
      Doc.cat(Doc.space),
      Doc.cat(Doc.annotate(selected, AnsiStyle.color(Color.white))),
      Doc.cat(Doc.hardLine)
    )
    return AnsiRender.prettyDefault(Optimize.optimize(doc, Optimize.Deep))
  })

const initialState: State = { cursor: 0 }

const processCursorUp = (state: State, choices: Prompt.Prompt.SelectOptions["choices"]) => {
  if (state.cursor === 0) {
    return Effect.succeed(promptAction.nextFrame({ cursor: choices.length - 1 }))
  }
  return Effect.succeed(promptAction.nextFrame({ cursor: state.cursor - 1 }))
}

const processCursorDown = (state: State, choices: Prompt.Prompt.SelectOptions["choices"]) => {
  if (state.cursor === choices.length - 1) {
    return Effect.succeed(promptAction.nextFrame({ cursor: 0 }))
  }
  return Effect.succeed(promptAction.nextFrame({ cursor: state.cursor + 1 }))
}

const processNext = (state: State, choices: Prompt.Prompt.SelectOptions["choices"]) =>
  Effect.succeed(promptAction.nextFrame({ cursor: (state.cursor + 1) % choices.length }))

/** @internal */
export const select = (options: Prompt.Prompt.SelectOptions): Prompt.Prompt<string> => {
  const opts: Required<Prompt.Prompt.SelectOptions> = {
    ...options
  }
  return prompt.custom(
    initialState,
    (state, action) => {
      switch (action._tag) {
        case "Beep": {
          return Effect.succeed(renderBeep)
        }
        case "Error": {
          return Effect.succeed(renderBeep)
        }
        case "NextFrame": {
          return renderNextFrame(opts.message, state, opts.choices)
        }
        case "Submit": {
          return renderSubmission(opts.message, state, opts.choices)
        }
      }
    },
    (input, state) => {
      switch (input.action) {
        case "CursorUp": {
          return processCursorUp(state, opts.choices)
        }
        case "CursorDown": {
          return processCursorDown(state, opts.choices)
        }
        case "Next": {
          return processNext(state, opts.choices)
        }
        case "Submit": {
          return Effect.succeed(promptAction.submit(opts.choices[state.cursor].value))
        }
        default: {
          return Effect.succeed(promptAction.beep)
        }
      }
    }
  )
}
