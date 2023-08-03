import * as Duration from "@effect/data/Duration"
import { pipe } from "@effect/data/Function"
import * as Effect from "@effect/io/Effect"
import * as Layer from "@effect/io/Layer"

const run = pipe(
  Effect.succeed(1),
  Effect.flatMap(n => Effect.succeed(n + 1)),
  Effect.delay(Duration.seconds(1)),
)

const MainLive = Layer.effectDiscard(run)

pipe(
  Layer.launch(MainLive),
  Effect.catchAllCause(Effect.logError),
  Effect.runFork,
)
