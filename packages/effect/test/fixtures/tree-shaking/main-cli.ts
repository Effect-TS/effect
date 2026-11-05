/**
 * A `Command.run` app with a string and an integer flag, provided with the
 * services `Command.run` requires for it: the three interactive terminal
 * operations the wizard uses (`columns`, `readInput` and `display`) and
 * `NodeStdio`. The bundle contains no file-system implementation and no other
 * terminal member.
 * Run as `node main.js --name Ada --count 2`; it prints two lines.
 */
import * as NodeStdio from "@effect/platform-node-shared/NodeStdio"
import * as NodeTerminal from "@effect/platform-node-shared/NodeTerminal"
import * as Command from "effect/cli/Command"
import * as Flag from "effect/cli/Flag"
import * as Console from "effect/Console"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import type * as Stdio from "effect/Stdio"

const greet = Command.make("greet", {
  name: Flag.String("name"),
  count: Flag.Int("count").pipe(Flag.withDefault(1))
}, ({ count, name }) =>
  Effect.gen(function*() {
    for (let i = 0; i < count; i++) {
      yield* Console.log(`Hello, ${name}!`)
    }
  }))

const environment: Layer.Layer<
  "effect/Terminal/columns" | "effect/Terminal/readInput" | "effect/Terminal/display" | Stdio.Stdio
> = Layer.mergeAll(NodeTerminal.columns, NodeTerminal.readInput, NodeTerminal.display, NodeStdio.layer)

Effect.runPromise(
  Command.run(greet, { version: "1.0.0" }).pipe(Effect.provide(environment))
).catch((error) => {
  process.stderr.write(`${error}\n`)
  process.exit(1)
})
