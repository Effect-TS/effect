import * as Runner from "@effect/platform-browser/WorkerRunner"
import { Effect, Stream } from "effect"
import { Person, User, WorkerMessage } from "./schema.js"

Effect.gen(function*(_) {
  let name = "test"

  return yield* _(
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
}).pipe(
  Effect.scoped,
  Effect.runFork
)
