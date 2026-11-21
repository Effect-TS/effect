import * as NodeStdio from "@effect/platform-node-shared/NodeStdio"
import * as Effect from "effect/Effect"
import * as Fiber from "effect/Fiber"
import * as Stdio from "effect/Stdio"
import * as Stream from "effect/Stream"

const readChunk = (stdio: Stdio.Stdio) =>
  stdio.stdin.pipe(
    Stream.take(1),
    Stream.decodeText(),
    Stream.mkString
  )

const program = Effect.gen(function*() {
  const stdio = yield* Stdio.Stdio

  const first = yield* readChunk(stdio)
  process.stdout.write(`CHUNK ${first}\n`)
  yield* Effect.sleep("20 millis")

  const second = yield* readChunk(stdio)
  process.stdout.write(`CHUNK ${second}\n`)

  const fiber = yield* stdio.stdin.pipe(Stream.runDrain, Effect.forkScoped)
  yield* Effect.sleep("50 millis")
  yield* Fiber.interrupt(fiber)
}).pipe(Effect.scoped, Effect.provide(NodeStdio.layer))

void Effect.runPromise(program)
