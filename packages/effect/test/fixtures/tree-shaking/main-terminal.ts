/**
 * A CLI-style program that only displays, provided with the one terminal
 * operation it requires, `NodeTerminal.display`. The bundle contains that
 * implementation and none of the other five: no `readline`, no key input
 * reader, no `stdin`.
 * Run as `node main.js`; it prints two lines.
 */
import * as NodeTerminal from "@effect/platform-node-shared/NodeTerminal"
import * as Effect from "effect/Effect"
import type * as Layer from "effect/Layer"
import * as Terminal from "effect/Terminal"

const program = Effect.gen(function*() {
  yield* Terminal.display("building...\n")
  yield* Terminal.display("done\n")
})

const terminal: Layer.Layer<"effect/Terminal/display"> = NodeTerminal.display

Effect.runPromise(program.pipe(Effect.provide(terminal))).catch((error) => {
  process.stderr.write(`${error}\n`)
  process.exit(1)
})
