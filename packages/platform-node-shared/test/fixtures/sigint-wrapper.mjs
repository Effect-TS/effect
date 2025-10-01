import { Effect } from "effect"
import * as Command from "@effect/platform/Command"
import {
  NodeCommandExecutor,
  NodeContext,
  NodeFileSystem,
  NodeRuntime,
} from "@effect/platform-node"

const envPort = process.env.REPRO_PORT ?? "48787"

const command = Command.make("bash", "-lc", `setsid node -e "setInterval(() => {}, 1000)"`).pipe(
  Command.stdin("inherit"),
  Command.stdout("inherit"),
  Command.stderr("inherit"),
  Command.env([["REPRO_PORT", envPort]]),
)

const program = Effect.gen(function* () {
  const proc = yield* Command.start(command)
  console.log(`child:${proc.pid}`)
  yield* Effect.never
}).pipe(
  Effect.provide(NodeCommandExecutor.layer),
  Effect.provide(NodeFileSystem.layer),
  Effect.provide(NodeContext.layer),
)

NodeRuntime.runMain(program)
