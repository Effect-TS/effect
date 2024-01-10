import * as Runner from "@effect/platform-browser/WorkerRunner"
import { Context, Effect, Layer, Option, Stream } from "effect"
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
  InitialMessage: (req) => Layer.succeed(Name, req.name),
  GetSpan: (_) =>
    Effect.gen(function*(_) {
      const span = yield* _(Effect.currentSpan, Effect.orDie)
      return {
        traceId: span.traceId,
        spanId: span.spanId,
        name: span.name,
        parent: Option.map(span.parent, (span) => ({
          traceId: span.traceId,
          spanId: span.spanId
        }))
      }
    }).pipe(Effect.withSpan("GetSpan"))
})
  .pipe(
    Layer.provide(Runner.layerPlatform)
  )

Effect.runFork(Layer.launch(WorkerLive))
