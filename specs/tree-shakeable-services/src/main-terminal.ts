/**
 * The composition root for the terminal program: two of the six terminal
 * layers, so the bundle carries neither the line reader nor the key-event
 * reader, although both are exports of the module the two come from.
 */
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { columns, display } from "./NodeTerminal.ts"
import { banner } from "./program-terminal.ts"

const text = process.argv[2] ?? "hello"

Effect.runPromise(banner(text).pipe(Effect.provide(Layer.mergeAll(columns, display)))).then(
  (width) => process.stdout.write(`displayed at ${width} columns\n`),
  (error) => {
    process.stderr.write(`${error}\n`)
    process.exit(1)
  }
)
