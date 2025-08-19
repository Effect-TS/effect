import * as Terminal from "@effect/platform/Terminal"
import * as Ansi from "@effect/printer-ansi/Ansi"
import * as Doc from "@effect/printer-ansi/AnsiDoc"
import * as Optimize from "@effect/printer/Optimize"
import * as Cause from "effect/Cause"
import type * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Fiber from "effect/Fiber"
import { dual } from "effect/Function"
import * as Option from "effect/Option"
import * as InternalAnsiUtils from "./ansi-utils.js"

/**
 * @internal
 */
export interface SpinnerOptions<A, E> {
  readonly message: string
  readonly frames?: ReadonlyArray<string>
  readonly interval?: Duration.DurationInput
  readonly onSuccess?: (value: A) => string
  readonly onFailure?: (error: E) => string
}

// Full classic dots spinner sequence
const DEFAULT_FRAMES: ReadonlyArray<string> = [
  "⠋",
  "⠙",
  "⠹",
  "⠸",
  "⠼",
  "⠴",
  "⠦",
  "⠧",
  "⠇",
  "⠏"
]

const DEFAULT_INTERVAL: Duration.DurationInput = "80 millis" as Duration.DurationInput

// Small render helpers to reduce per-frame work.
const CLEAR_LINE = Doc.cat(Doc.eraseLine, Doc.cursorLeft)
const CURSOR_HIDE = Doc.render(Doc.cursorHide, { style: "pretty" })
const CURSOR_SHOW = Doc.render(Doc.cursorShow, { style: "pretty" })
const renderWithWidth = (columns: number) => Doc.render({ style: "pretty", options: { lineWidth: columns } })

const optimizeAndRender = (columns: number, doc: Doc.Doc<any>, addNewline = false) => {
  const prepared = addNewline ? Doc.cat(doc, Doc.hardLine) : doc
  return prepared.pipe(Optimize.optimize(Optimize.Deep), renderWithWidth(columns))
}

/**
 * A spinner that renders while `effect` runs and prints ✔/✖ on completion.
 *
 * @internal
 */
export const spinner: {
  <A, E, R>(
    options: SpinnerOptions<A, E>
  ): (effect: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R | Terminal.Terminal>
  <A, E, R>(
    effect: Effect.Effect<A, E, R>,
    options: SpinnerOptions<A, E>
  ): Effect.Effect<A, E, R | Terminal.Terminal>
} = dual(
  2,
  <A, E, R>(
    effect: Effect.Effect<A, E, R>,
    options: SpinnerOptions<A, E>
  ): Effect.Effect<A, E, R | Terminal.Terminal> =>
    Effect.acquireUseRelease(
      // acquire
      Effect.gen(function*() {
        const terminal = yield* Terminal.Terminal

        // Hide cursor while active
        yield* Effect.orDie(terminal.display(CURSOR_HIDE))

        let index = 0
        let exit: Exit.Exit<A, E> | undefined = undefined

        const message = options.message
        const frames = options.frames ?? DEFAULT_FRAMES
        const frameCount = frames.length
        const interval = options.interval ?? DEFAULT_INTERVAL

        const messageDoc = Doc.annotate(Doc.text(message), Ansi.bold)

        const displayDoc = (doc: Doc.Doc<any>, addNewline = false) =>
          Effect.gen(function*() {
            const columns = yield* terminal.columns
            const out = optimizeAndRender(columns, doc, addNewline)
            yield* Effect.orDie(terminal.display(out))
          })

        const renderFrame = Effect.gen(function*() {
          const i = index
          index = index + 1
          const spinnerDoc = Doc.annotate(Doc.text(frames[i % frameCount]!), Ansi.blue)

          const line = Doc.hsep([spinnerDoc, messageDoc])
          yield* displayDoc(Doc.cat(CLEAR_LINE, line))
        })

        const computeFinalMessage = (exit: Exit.Exit<A, E>): string =>
          Exit.match(exit, {
            onFailure: (cause) => {
              let baseMessage = message
              if (options.onFailure) {
                const failureOption = Cause.failureOption(cause)
                if (Option.isSome(failureOption)) {
                  baseMessage = options.onFailure(failureOption.value)
                }
              }
              if (Cause.isInterrupted(cause)) {
                return `${baseMessage} (interrupted)`
              } else if (Cause.isDie(cause)) {
                return `${baseMessage} (died)`
              } else {
                return baseMessage
              }
            },
            onSuccess: (value) => options.onSuccess ? options.onSuccess(value) : message
          })

        const renderFinal = (exit: Exit.Exit<A, E>) =>
          Effect.gen(function*() {
            const figures = yield* InternalAnsiUtils.figures
            const icon = Exit.isSuccess(exit)
              ? Doc.annotate(figures.tick, Ansi.green)
              : Doc.annotate(figures.cross, Ansi.red)

            const finalMessage = computeFinalMessage(exit)

            const msgDoc = Doc.annotate(Doc.text(finalMessage), Ansi.bold)
            const line = Doc.hsep([icon, msgDoc])

            yield* displayDoc(Doc.cat(CLEAR_LINE, line), true)
          })

        // Spinner fiber: loop until we see an Exit in exit, then render final line and stop.
        const loop = Effect.gen(function*() {
          while (true) {
            if (exit !== undefined) {
              yield* renderFinal(exit)
              break
            }
            yield* renderFrame
            yield* Effect.sleep(interval)
          }
        }).pipe(
          // Always restore cursor from inside the spinner fiber too
          Effect.ensuring(Effect.orDie(terminal.display(CURSOR_SHOW)))
        )

        const fiber = yield* Effect.fork(loop)
        return {
          fiber,
          terminal,
          setExit: (e: Exit.Exit<A, E>) => {
            exit = e
          }
        }
      }),
      // use
      (_) => effect,
      // release
      ({ fiber, setExit, terminal }, exitValue) =>
        Effect.gen(function*() {
          // Signal the spinner fiber to finish by setting the exit.
          // (No external interrupt of the spinner fiber.)
          setExit(exitValue)

          // Wait a short, bounded time for the spinner to flush final output.
          // If this ever times out in a pathological TTY, we fail-safe and continue.
          yield* Fiber.await(fiber).pipe(Effect.timeout("2 seconds"), Effect.ignore)
        }).pipe(
          // Ensure cursor is shown even if something above failed.
          Effect.ensuring(Effect.orDie(terminal.display(CURSOR_SHOW)))
        )
    )
)
