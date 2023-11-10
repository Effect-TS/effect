import * as Schema from "@effect/schema/Schema"
import * as TreeFormatter from "@effect/schema/TreeFormatter"
import { Context, Effect, Layer, pipe } from "effect"
import * as readline from "node:readline"
import type * as Terminal from "../Terminal.js"

/** @internal */
export const Tag = Context.Tag<Terminal.Terminal>()

const RawUserInput = Schema.struct({
  key: Schema.struct({
    sequence: Schema.optional(Schema.union(Schema.string, Schema.undefined)),
    name: Schema.optional(Schema.union(Schema.string, Schema.undefined)),
    ctrl: Schema.optional(Schema.union(Schema.boolean, Schema.undefined)),
    meta: Schema.optional(Schema.union(Schema.boolean, Schema.undefined)),
    shift: Schema.optional(Schema.union(Schema.boolean, Schema.undefined))
  }),
  input: Schema.union(Schema.string, Schema.undefined)
})

const parseUserInput = Schema.parse(RawUserInput)

const ctrlKeyMap: Record<string, Effect.Effect<never, never, Terminal.Terminal.Action>> = {
  // ctrl+a
  a: Effect.succeed("CursorFirst"),
  // ctrl+c
  c: Effect.dieMessage("Received interrupt signal, aborting..."),
  // ctrl+d
  d: Effect.dieMessage("Received interrupt signal, aborting..."),
  // ctrl+e
  e: Effect.succeed("CursorLast"),
  // ctrl+g
  g: Effect.succeed("Reset")
}

const keyMap: Record<string, Terminal.Terminal.Action> = {
  j: "CursorDown",
  k: "CursorUp",
  backspace: "Backspace",
  end: "End",
  enter: "Submit",
  escape: "Exit",
  delete: "Delete",
  down: "CursorDown",
  home: "Start",
  left: "CursorLeft",
  pagedown: "NextPage",
  pageup: "PreviousPage",
  return: "Submit",
  right: "CursorRight",
  tab: "Next",
  up: "CursorUp"
}

const parseAction = (key: readline.Key): Effect.Effect<never, never, Terminal.Terminal.Action> => {
  if (key.name !== undefined) {
    if (key.ctrl && key.name in ctrlKeyMap) {
      return ctrlKeyMap[key.name]
    }
    if (key.name in keyMap) {
      return Effect.succeed(keyMap[key.name])
    }
  }
  return Effect.succeed("Retry")
}

/** @internal */
export const LiveTerminal: Layer.Layer<never, never, Terminal.Terminal> = Layer.scoped(
  Tag,
  Effect.gen(function*($) {
    const { input, output } = yield* $(
      Effect.all({
        input: Effect.sync(() => process.stdin),
        output: Effect.sync(() => process.stdout)
      }),
      Effect.tap(
        ({ input }) =>
          Effect.acquireRelease(
            Effect.sync(() => {
              const rl = readline.createInterface({ input, escapeCodeTimeout: 50 })
              readline.emitKeypressEvents(input, rl)
              if (input.isTTY) {
                input.setRawMode(true)
              }
              return rl
            }),
            (rl) =>
              Effect.sync(() => {
                if (input.isTTY) {
                  input.setRawMode(false)
                }
                rl.close()
              })
          )
      )
    )

    const getUserInput = Effect.async<never, never, Terminal.Terminal.UserInput>((resume) => {
      const handleKeypress = (input: string | undefined, key: readline.Key) => {
        resume(pipe(
          parseUserInput({ key, input }),
          Effect.mapError((error) => TreeFormatter.formatErrors(error.errors)),
          Effect.flatMap(({ input, key }) =>
            Effect.map(
              parseAction(key),
              (action) => ({ value: input || "", action })
            )
          ),
          Effect.orDie
        ))
      }
      input.once("keypress", handleKeypress)
      return Effect.sync(() => {
        input.removeListener("keypress", handleKeypress)
      })
    })

    const display = (prompt: string) =>
      Effect.uninterruptible(
        Effect.async<never, never, void>((resume) => {
          output.write(prompt, () => {
            resume(Effect.unit)
          })
        })
      )

    return Tag.of({ getUserInput, display })
  })
)
