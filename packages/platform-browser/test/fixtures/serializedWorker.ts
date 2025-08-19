import * as BrowserRunner from "@effect/platform-browser/BrowserWorkerRunner"
import * as Runner from "@effect/platform/WorkerRunner"
import { Context, Effect, Layer, Option, Stream } from "effect"
import { Person, User, WorkerMessage } from "./schema.js"

interface Name {
  readonly _: unique symbol
}
const Name = Context.GenericTag<Name, string>("Name")

const WorkerLive = Runner.layerSerialized(WorkerMessage, {
  GetPersonById: (req) =>
    Stream.make(
      new Person({ id: req.id, name: "test", data: new Uint8Array([1, 2, 3]) }),
      new Person({ id: req.id, name: "ing", data: new Uint8Array([4, 5, 6]) })
    ),
  GetUserById: (req) => Effect.map(Name, (name) => new User({ id: req.id, name })),
  InitialMessage: (req) => Layer.succeed(Name, req.name),
  GetSpan: (_) =>
    Effect.gen(function*() {
      const span = yield* Effect.currentSpan.pipe(Effect.orDie)
      return {
        traceId: span.traceId,
        spanId: span.spanId,
        name: span.name,
        parent: Option.map(span.parent, (span) => ({
          traceId: span.traceId,
          spanId: span.spanId
        }))
      }
    }).pipe(Effect.withSpan("GetSpan")),
  RunnerInterrupt: () => Effect.interrupt
})
  .pipe(
    Layer.provide(BrowserRunner.layer)
  )

Effect.runFork(Runner.launch(WorkerLive))
