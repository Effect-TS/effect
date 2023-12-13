import * as Runner from "@effect/platform-browser/WorkerRunner"
import * as Schema from "@effect/schema/Schema"
import { Effect, Stream } from "effect"
import { GetPersonById, GetUserById, Person, User } from "./schema.js"

Runner.makeSerialized(Schema.union(GetUserById, GetPersonById), {
  GetPersonById: (req) =>
    Stream.make(
      new Person({ id: req.id, name: "test" }),
      new Person({ id: req.id, name: "ing" })
    ),
  GetUserById: (req) => Effect.succeed(new User({ id: req.id, name: "test" }))
}).pipe(
  Effect.scoped,
  Effect.runFork
)
