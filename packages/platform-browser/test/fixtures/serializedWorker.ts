import * as Runner from "@effect/platform-browser/WorkerRunner"
import { Context, Effect, Layer, Stream } from "effect"
import { Person, User, WorkerMessage } from "./schema.js"

interface Name {
  readonly _: unique symbol
}
const Name = Context.Tag<Name, string>()

const WorkerLive = Runner.layerSerialized(WorkerMessage, {
  GetPersonById: (req) =>
    Stream.make(
      new Person({ id: req.id, name: "test" }),
      new Person({ id: req.id, name: "ing" })
    ),
  GetUserById: (req) => Effect.map(Name, (name) => new User({ id: req.id, name })),
  SetName: (req) => Layer.succeed(Name, req.name)
})
  .pipe(
    Layer.provide(Runner.layerPlatform)
  )

Effect.runFork(Layer.launch(WorkerLive))
