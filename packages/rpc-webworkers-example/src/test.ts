import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import { pipe } from "effect/Function"
import * as Layer from "effect/Layer"

const run = pipe(
  Effect.succeed(1),
  Effect.flatMap((n) => Effect.succeed(n + 1)),
  Effect.delay(Duration.seconds(1))
)

const MainLive = Layer.effectDiscard(run)

pipe(
  Layer.launch(MainLive),
  Effect.catchAllCause(Effect.logError),
  Effect.runFork
)
