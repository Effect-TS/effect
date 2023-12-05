import * as Runtime from "@effect/platform-node/Runtime"
import * as Terminal from "@effect/platform-node/Terminal"
import { Console, Effect } from "effect"

const program = Effect.gen(function*(_) {
  const terminal = yield* _(Terminal.Terminal)

  const line1 = yield* _(terminal.readLine)
  yield* _(Console.log(`First line: ${line1}`))

  const line2 = yield* _(terminal.readLine)
  yield* _(Console.log(`Second line: ${line2}`))

  const line3 = yield* _(terminal.readLine)
  yield* _(Console.log(`Third line: ${line3}`))
})

const MainLive = Terminal.layer

program.pipe(
  Effect.provide(MainLive),
  Runtime.runMain
)
