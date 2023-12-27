import * as Terminal from "@effect/platform/Terminal"
import * as Ansi from "@effect/printer-ansi/Ansi"
import * as Doc from "@effect/printer-ansi/AnsiDoc"
import * as Optimize from "@effect/printer/Optimize"
import * as Effect from "effect/Effect"
import { pipe } from "effect/Function"
import * as Match from "effect/Match"
import * as Option from "effect/Option"
import * as ReadonlyArray from "effect/ReadonlyArray"
import type * as Prompt from "../../Prompt.js"
import * as InternalPrompt from "../prompt.js"
import * as InternalPromptAction from "./action.js"
import * as InternalAnsiUtils from "./ansi-utils.js"

interface State {
  readonly typed: string
  readonly cursor: number
  readonly value: globalThis.Date
  readonly dateParts: ReadonlyArray<DatePart>
  readonly error: Option.Option<string>
}

const renderBeep = Doc.render(Doc.beep, { style: "pretty" })

const renderClearScreen = (
  prevState: Option.Option<State>,
  options: Required<Prompt.Prompt.DateOptions>,
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

const renderError = (nextState: State, pointer: Doc.AnsiDoc): Doc.AnsiDoc =>
  Option.match(nextState.error, {
    onNone: () => Doc.empty,
    onSome: (error) => {
      const errorLines = error.split(/\r?\n/)
      if (ReadonlyArray.isNonEmptyReadonlyArray(errorLines)) {
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
      return Doc.empty
    }
  })

const renderParts = (nextState: State, submitted: boolean = false) =>
  ReadonlyArray.reduce(
    nextState.dateParts,
    Doc.empty as Doc.AnsiDoc,
    (doc, part, currentIndex) => {
      const partDoc = Doc.text(part.toString())
      if (currentIndex === nextState.cursor && !submitted) {
        const annotation = Ansi.combine(Ansi.underlined, Ansi.cyanBright)
        return Doc.cat(doc, Doc.annotate(partDoc, annotation))
      }
      return Doc.cat(doc, partDoc)
    }
  )

const renderOutput = (
  leadingSymbol: Doc.AnsiDoc,
  trailingSymbol: Doc.AnsiDoc,
  parts: Doc.AnsiDoc,
  options: Required<Prompt.Prompt.DateOptions>
): Doc.AnsiDoc => {
  const annotateLine = (line: string): Doc.AnsiDoc => Doc.annotate(Doc.text(line), Ansi.bold)
  const prefix = Doc.cat(leadingSymbol, Doc.space)
  return ReadonlyArray.match(options.message.split(/\r?\n/), {
    onEmpty: () => Doc.hsep([prefix, trailingSymbol, parts]),
    onNonEmpty: (promptLines) => {
      const lines = ReadonlyArray.map(promptLines, (line) => annotateLine(line))
      return pipe(
        prefix,
        Doc.cat(Doc.nest(Doc.vsep(lines), 2)),
        Doc.cat(Doc.space),
        Doc.cat(trailingSymbol),
        Doc.cat(Doc.space),
        Doc.cat(parts)
      )
    }
  })
}

const renderNextFrame = (
  prevState: Option.Option<State>,
  nextState: State,
  options: Required<Prompt.Prompt.DateOptions>
): Effect.Effect<Terminal.Terminal, never, string> =>
  Effect.gen(function*(_) {
    const terminal = yield* _(Terminal.Terminal)
    const figures = yield* _(InternalAnsiUtils.figures)
    const columns = yield* _(terminal.columns)
    const clearScreen = renderClearScreen(prevState, options, columns)
    const leadingSymbol = Doc.annotate(Doc.text("?"), Ansi.cyanBright)
    const trailingSymbol = Doc.annotate(figures.pointerSmall, Ansi.blackBright)
    const parts = renderParts(nextState)
    const promptMsg = renderOutput(leadingSymbol, trailingSymbol, parts, options)
    const errorMsg = renderError(nextState, figures.pointerSmall)
    return pipe(
      clearScreen,
      Doc.cat(Doc.cursorHide),
      Doc.cat(promptMsg),
      Doc.cat(errorMsg),
      Optimize.optimize(Optimize.Deep),
      Doc.render({ style: "pretty" })
    )
  })

const renderSubmission = (nextState: State, options: Required<Prompt.Prompt.DateOptions>) =>
  Effect.gen(function*(_) {
    const terminal = yield* _(Terminal.Terminal)
    const figures = yield* _(InternalAnsiUtils.figures)
    const columns = yield* _(terminal.columns)
    const clearScreen = renderClearScreen(Option.some(nextState), options, columns)
    const leadingSymbol = Doc.annotate(figures.tick, Ansi.green)
    const trailingSymbol = Doc.annotate(figures.ellipsis, Ansi.blackBright)
    const parts = renderParts(nextState, true)
    const promptMsg = renderOutput(leadingSymbol, trailingSymbol, parts, options)
    return pipe(
      clearScreen,
      Doc.cat(promptMsg),
      Doc.cat(Doc.hardLine),
      Optimize.optimize(Optimize.Deep),
      Doc.render({ style: "pretty" })
    )
  })

const processUp = (currentState: State) => {
  currentState.dateParts[currentState.cursor].increment()
  return InternalPromptAction.nextFrame({
    ...currentState,
    typed: ""
  })
}

const processDown = (currentState: State) => {
  currentState.dateParts[currentState.cursor].decrement()
  return InternalPromptAction.nextFrame({
    ...currentState,
    typed: ""
  })
}

const processCursorLeft = (currentState: State) => {
  const previousPart = currentState.dateParts[currentState.cursor].previousPart()
  return Option.match(previousPart, {
    onNone: () => InternalPromptAction.beep,
    onSome: (previous) =>
      InternalPromptAction.nextFrame({
        ...currentState,
        typed: "",
        cursor: currentState.dateParts.indexOf(previous)
      })
  })
}

const processCursorRight = (currentState: State) => {
  const nextPart = currentState.dateParts[currentState.cursor].nextPart()
  return Option.match(nextPart, {
    onNone: () => InternalPromptAction.beep,
    onSome: (next) =>
      InternalPromptAction.nextFrame({
        ...currentState,
        typed: "",
        cursor: currentState.dateParts.indexOf(next)
      })
  })
}

const processNext = (currentState: State) => {
  const nextPart = currentState.dateParts[currentState.cursor].nextPart()
  const cursor = Option.match(nextPart, {
    onNone: () => currentState.dateParts.findIndex((part) => !part.isToken()),
    onSome: (next) => currentState.dateParts.indexOf(next)
  })
  return InternalPromptAction.nextFrame({
    ...currentState,
    cursor
  })
}

const defaultProcessor = (value: string, currentState: State) => {
  if (/\d/.test(value)) {
    const typed = currentState.typed + value
    currentState.dateParts[currentState.cursor].setValue(typed)
    return InternalPromptAction.nextFrame({
      ...currentState,
      typed
    })
  }
  return InternalPromptAction.beep
}

const defaultLocales: Prompt.Prompt.DateOptions["locales"] = {
  months: [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December"
  ],
  monthsShort: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  weekdays: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
  weekdaysShort: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
}

/** @internal */
export const date = (options: Prompt.Prompt.DateOptions): Prompt.Prompt<globalThis.Date> => {
  const opts: Required<Prompt.Prompt.DateOptions> = {
    initial: new Date(),
    dateMask: "YYYY-MM-DD HH:mm:ss",
    validate: Effect.succeed,
    ...options,
    locales: {
      ...defaultLocales,
      ...options.locales
    }
  }
  const dateParts = makeDateParts(opts.dateMask, opts.initial, opts.locales)
  const initialCursorPosition = dateParts.findIndex((part) => !part.isToken())
  return InternalPrompt.custom(
    {
      dateParts,
      typed: "",
      cursor: initialCursorPosition,
      value: opts.initial,
      error: Option.none()
    } as State,
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
        case "left": {
          return Effect.succeed(processCursorLeft(state))
        }
        case "right": {
          return Effect.succeed(processCursorRight(state))
        }
        case "k":
        case "up": {
          return Effect.succeed(processUp(state))
        }
        case "j":
        case "down": {
          return Effect.succeed(processDown(state))
        }
        case "tab": {
          return Effect.succeed(processNext(state))
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
          return Effect.succeed(defaultProcessor(value, state))
        }
      }
    }
  )
}

const DATE_PART_REGEX =
  /\\(.)|"((?:\\["\\]|[^"])+)"|(D[Do]?|d{3,4}|d)|(M{1,4})|(YY(?:YY)?)|([aA])|([Hh]{1,2})|(m{1,2})|(s{1,2})|(S{1,4})|./g

const regexGroups: Record<number, (params: DatePartParams) => DatePart> = {
  1: ({ token, ...opts }) => new Token({ token: token.replace(/\\(.)/g, "$1"), ...opts }),
  2: (opts) => new Day(opts),
  3: (opts) => new Month(opts),
  4: (opts) => new Year(opts),
  5: (opts) => new Meridiem(opts),
  6: (opts) => new Hours(opts),
  7: (opts) => new Minutes(opts),
  8: (opts) => new Seconds(opts),
  9: (opts) => new Milliseconds(opts)
}

const makeDateParts = (
  dateMask: string,
  date: globalThis.Date,
  locales: Prompt.Prompt.DateOptions["locales"]
) => {
  const parts: Array<DatePart> = []
  let result: RegExpExecArray | null = null
  // eslint-disable-next-line no-cond-assign
  while (result = DATE_PART_REGEX.exec(dateMask)) {
    const match = result.shift()
    const index = result.findIndex((group) => group !== undefined)
    if (index in regexGroups) {
      const token = (result[index] || match)!
      parts.push(regexGroups[index]({ token, date, parts, locales }))
    } else {
      parts.push(new Token({ token: (result[index] || match)!, date, parts, locales }))
    }
  }
  const orderedParts = parts.reduce((array, element) => {
    const lastElement = array[array.length - 1]
    if (element.isToken() && lastElement !== undefined && lastElement.isToken()) {
      lastElement.setValue(element.token)
    } else {
      array.push(element)
    }
    return array
  }, ReadonlyArray.empty<DatePart>())
  parts.splice(0, parts.length, ...orderedParts)
  return parts
}

interface DatePartParams {
  readonly token: string
  readonly locales: Prompt.Prompt.DateOptions["locales"]
  readonly date?: globalThis.Date
  readonly parts?: ReadonlyArray<DatePart>
}

abstract class DatePart {
  token: string
  readonly date: globalThis.Date
  readonly parts: ReadonlyArray<DatePart>
  readonly locales: Prompt.Prompt.DateOptions["locales"]

  constructor(params: DatePartParams) {
    this.token = params.token
    this.locales = params.locales
    this.date = params.date || new Date()
    this.parts = params.parts || [this]
  }

  /**
   * Increments this date part.
   */
  abstract increment(): void

  /**
   * Decrements this date part.
   */
  abstract decrement(): void

  /**
   * Sets the current value of this date part to the provided value.
   */
  abstract setValue(value: string): void

  /**
   * Returns `true` if this `DatePart` is a `Token`, `false` otherwise.
   */
  isToken(): this is Token {
    return false
  }

  /**
   * Retrieves the next date part in the list of parts.
   */
  nextPart(): Option.Option<DatePart> {
    return pipe(
      ReadonlyArray.findFirstIndex(this.parts, (part) => part === this),
      Option.flatMap((currentPartIndex) =>
        ReadonlyArray.findFirst(this.parts.slice(currentPartIndex + 1), (part) => !part.isToken())
      )
    )
  }

  /**
   * Retrieves the previous date part in the list of parts.
   */
  previousPart(): Option.Option<DatePart> {
    return pipe(
      ReadonlyArray.findFirstIndex(this.parts, (part) => part === this),
      Option.flatMap((currentPartIndex) =>
        ReadonlyArray.findLast(this.parts.slice(0, currentPartIndex), (part) => !part.isToken())
      )
    )
  }

  toString() {
    return String(this.date)
  }
}

class Token extends DatePart {
  increment(): void {}

  decrement(): void {}

  setValue(value: string): void {
    this.token = this.token + value
  }

  isToken(): this is Token {
    return true
  }

  toString() {
    return this.token
  }
}

class Milliseconds extends DatePart {
  increment(): void {
    this.date.setMilliseconds(this.date.getMilliseconds() + 1)
  }

  decrement(): void {
    this.date.setMilliseconds(this.date.getMilliseconds() - 1)
  }

  setValue(value: string): void {
    this.date.setMilliseconds(Number.parseInt(value.slice(-this.token.length)))
  }

  toString() {
    const millis = `${this.date.getMilliseconds()}`
    return millis.padStart(4, "0").substring(0, this.token.length)
  }
}

class Seconds extends DatePart {
  increment(): void {
    this.date.setSeconds(this.date.getSeconds() + 1)
  }

  decrement(): void {
    this.date.setSeconds(this.date.getSeconds() - 1)
  }

  setValue(value: string): void {
    this.date.setSeconds(Number.parseInt(value.slice(-2)))
  }

  toString() {
    const seconds = `${this.date.getSeconds()}`
    return this.token.length > 1
      ? seconds.padStart(2, "0")
      : seconds
  }
}

class Minutes extends DatePart {
  increment(): void {
    this.date.setMinutes(this.date.getMinutes() + 1)
  }

  decrement(): void {
    this.date.setMinutes(this.date.getMinutes() - 1)
  }

  setValue(value: string): void {
    this.date.setMinutes(Number.parseInt(value.slice(-2)))
  }

  toString() {
    const minutes = `${this.date.getMinutes()}`
    return this.token.length > 1
      ? minutes.padStart(2, "0") :
      minutes
  }
}

class Hours extends DatePart {
  increment(): void {
    this.date.setHours(this.date.getHours() + 1)
  }

  decrement(): void {
    this.date.setHours(this.date.getHours() - 1)
  }

  setValue(value: string): void {
    this.date.setHours(Number.parseInt(value.slice(-2)))
  }

  toString() {
    const hours = /h/.test(this.token)
      ? this.date.getHours() % 12 || 12
      : this.date.getHours()
    return this.token.length > 1
      ? `${hours}`.padStart(2, "0")
      : `${hours}`
  }
}

class Day extends DatePart {
  increment(): void {
    this.date.setDate(this.date.getDate() + 1)
  }

  decrement(): void {
    this.date.setDate(this.date.getDate() - 1)
  }

  setValue(value: string): void {
    this.date.setDate(Number.parseInt(value.slice(-2)))
  }

  toString() {
    const date = this.date.getDate()
    const day = this.date.getDay()
    return pipe(
      Match.value(this.token),
      Match.when("DD", () => `${date}`.padStart(2, "0")),
      Match.when("Do", () => `${date}${this.ordinalIndicator(date)}`),
      Match.when("d", () => `${day + 1}`),
      Match.when("ddd", () => this.locales!.weekdaysShort[day]!),
      Match.when("dddd", () => this.locales!.weekdays[day]!),
      Match.orElse(() => `${date}`)
    )
  }

  private ordinalIndicator(day: number): string {
    return pipe(
      Match.value(day % 10),
      Match.when(1, () => "st"),
      Match.when(2, () => "nd"),
      Match.when(3, () => "rd"),
      Match.orElse(() => "th")
    )
  }
}

class Month extends DatePart {
  increment(): void {
    this.date.setMonth(this.date.getMonth() + 1)
  }

  decrement(): void {
    this.date.setMonth(this.date.getMonth() - 1)
  }

  setValue(value: string): void {
    const month = Number.parseInt(value.slice(-2)) - 1
    this.date.setMonth(month < 0 ? 0 : month)
  }

  toString() {
    const month = this.date.getMonth()
    return pipe(
      Match.value(this.token.length),
      Match.when(2, () => `${month + 1}`.padStart(2, "0")),
      Match.when(3, () => this.locales!.monthsShort[month]!),
      Match.when(4, () => this.locales!.months[month]!),
      Match.orElse(() => `${month + 1}`)
    )
  }
}

class Year extends DatePart {
  increment(): void {
    this.date.setFullYear(this.date.getFullYear() + 1)
  }

  decrement(): void {
    this.date.setFullYear(this.date.getFullYear() - 1)
  }

  setValue(value: string): void {
    this.date.setFullYear(Number.parseInt(value.slice(-4)))
  }

  toString() {
    const year = `${this.date.getFullYear()}`.padStart(4, "0")
    return this.token.length === 2
      ? year.substring(-2)
      : year
  }
}

class Meridiem extends DatePart {
  increment(): void {
    this.date.setHours((this.date.getHours() + 12) % 24)
  }

  decrement(): void {
    this.increment()
  }

  setValue(_value: string): void {}

  toString() {
    const meridiem = this.date.getHours() > 12 ? "pm" : "am"
    return /A/.test(this.token)
      ? meridiem.toUpperCase()
      : meridiem
  }
}
