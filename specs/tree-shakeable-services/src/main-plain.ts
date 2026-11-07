/**
 * The composition root for the plain program. The bundle check builds it twice,
 * with this branch's `Context.ts` and with the branch point's, and reports the
 * difference: what the record-service code costs a bundle that holds no record.
 */
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { greet, Greeting, Name } from "./program-plain.ts"

const live = Layer.mergeAll(Layer.succeed(Greeting, "hello"), Layer.succeed(Name, process.argv[2] ?? "world"))

Effect.runPromise(greet.pipe(Effect.provide(live))).then(
  (text) => process.stdout.write(`${text}\n`),
  (error) => {
    process.stderr.write(`${error}\n`)
    process.exit(1)
  }
)
