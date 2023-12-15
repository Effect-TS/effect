import * as Runner from "@effect/platform-browser/WorkerRunner"
import { Effect, Layer, Stream } from "effect"
import { Person, User, WorkerMessage } from "./schema.js"

const WorkerLive = Layer.scopedDiscard(
  Effect.gen(function*(_) {
    let name = "test"

    yield* _(
      Runner.makeSerialized(WorkerMessage, {
        GetPersonById: (req) =>
          Stream.make(
            new Person({ id: req.id, name: "test" }),
            new Person({ id: req.id, name: "ing" })
          ),
        GetUserById: (req) => Effect.succeed(new User({ id: req.id, name })),
        SetName: (req) =>
          Effect.sync(() => {
            name = req.name
          })
      })
    )
  })
).pipe(
  Layer.provide(Runner.layerPlatform)
)

Effect.runFork(Layer.launch(WorkerLive))
