import { Terminal } from "@effect/platform"
import { NodeRuntime, NodeTerminal } from "@effect/platform-node"
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

const MainLive = NodeTerminal.layer

program.pipe(
  Effect.provide(MainLive),
  NodeRuntime.runMain
)
