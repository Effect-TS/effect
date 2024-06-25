import { Terminal } from "@effect/platform"
import { NodeRuntime, NodeTerminal } from "@effect/platform-node"
import { Console, Effect } from "effect"

const program = Effect.gen(function*() {
  const terminal = yield* Terminal.Terminal

  const line1 = yield* terminal.readLine
  yield* Console.log(`First line: ${line1}`)

  const line2 = yield* terminal.readLine
  yield* Console.log(`Second line: ${line2}`)

  const line3 = yield* terminal.readLine
  yield* Console.log(`Third line: ${line3}`)
})

const MainLive = NodeTerminal.layer

program.pipe(
  Effect.provide(MainLive),
  NodeRuntime.runMain
)
