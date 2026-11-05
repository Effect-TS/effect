import type * as Cause from "effect/Cause"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as Queue from "effect/Queue"
import * as RcRef from "effect/RcRef"
import * as Terminal from "effect/Terminal"
import type * as readline from "node:readline"
import * as Input from "./input.ts"

/** @internal */
export const make = (input: Input.InputShape): Terminal.Shape["readInput"] =>
  Effect.gen(function*() {
    const stdin = input.getStdin()
    const queue = yield* Queue.make<Terminal.UserInput, Cause.Done>()
    const handleKeypress = (s: string | undefined, k: readline.Key) => {
      const userInput = {
        input: Option.fromUndefinedOr(s),
        key: { name: k.name ?? "", ctrl: !!k.ctrl, meta: !!k.meta, shift: !!k.shift }
      }
      Queue.offerUnsafe(queue, userInput)
      if (input.shouldQuit(userInput)) {
        Queue.endUnsafe(queue)
      }
    }
    // Deno's `process.stdin` shim does not keep the event loop alive, so a
    // program blocked on input can exit before `end` is ever delivered. A
    // timer holds the loop open for as long as this reader is active.
    const keepAlive = setInterval(() => {}, 2147483647)
    // Without this, consumers (e.g. `Prompt.run`) hang forever on closed stdin.
    const handleEnd = () => {
      clearInterval(keepAlive)
      Queue.endUnsafe(queue)
    }
    yield* Effect.addFinalizer(() =>
      Effect.sync(() => {
        clearInterval(keepAlive)
        stdin.off("keypress", handleKeypress)
        stdin.off("end", handleEnd)
      })
    )
    stdin.on("keypress", handleKeypress)
    if (input.inputEnded()) {
      handleEnd()
    } else {
      yield* RcRef.get(input.readline)
      yield* RcRef.get(input.rawMode)
      stdin.once("end", handleEnd)
    }
    return queue as Queue.Dequeue<Terminal.UserInput, Cause.Done>
  })

/** @internal */
export const layer: Layer.Layer<"effect/Terminal/readInput"> = Layer.effect(
  Terminal.readInput,
  Effect.map(Effect.service(Input.Input), make)
).pipe(Layer.provide(Input.layer))
