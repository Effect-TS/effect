import { Machine } from "@effect/experimental"
import { runMain } from "@effect/platform-node/NodeRuntime"
import { Effect, List, pipe, Schedule, Schema } from "effect"

class SendError extends Schema.TaggedError<SendError>()(
  "SendError",
  {
    email: Schema.String,
    reason: Schema.String
  }
) {}

class SendEmail extends Schema.TaggedRequest<SendEmail>()(
  "SendEmail",
  {
    failure: SendError,
    success: Schema.Void,
    payload: {
      email: Schema.String,
      message: Schema.String
    }
  }
) {}

class ProcessEmail extends Schema.TaggedRequest<ProcessEmail>()(
  "ProcessEmail",
  { failure: Schema.Never, success: Schema.Void, payload: {} }
) {}

class Shutdown extends Schema.TaggedRequest<Shutdown>()(
  "Shutdown",
  { failure: Schema.Never, success: Schema.Void, payload: {} }
) {}

const mailer = Machine.makeSerializable({
  state: Schema.List(SendEmail)
}, (_, previous) =>
  Effect.gen(function*() {
    const ctx = yield* Machine.MachineContext
    const state = previous ?? List.empty()

    if (List.isCons(state)) {
      yield* ctx.unsafeSend(new ProcessEmail()).pipe(Effect.replicateEffect(List.size(state)))
    }

    return Machine.serializable.make(state).pipe(
      Machine.serializable.addPrivate(ProcessEmail, ({ state }) =>
        Effect.gen(function*() {
          if (List.isNil(state)) {
            return [void 0, state]
          }
          const req = state.head
          yield* Effect.log(`Sending email to ${req.email}`).pipe(Effect.delay(500))
          return [void 0, state.tail]
        })),
      Machine.serializable.add(SendEmail, (ctx) =>
        ctx.send(new ProcessEmail()).pipe(
          Effect.as([void 0, List.append(ctx.state, ctx.request)])
        )),
      Machine.serializable.add(Shutdown, () =>
        Effect.log("Shutting down").pipe(
          Effect.zipRight(Effect.interrupt)
        ))
    )
  })).pipe(
    Machine.retry(Schedule.forever)
  )

const program = Effect.gen(function*() {
  const actor = yield* Machine.boot(mailer)
  yield* actor.send(new SendEmail({ email: "test@example.com", message: "Hello, World!" }))
  yield* actor.send(new SendEmail({ email: "test@example.com", message: "Hello, World!" }))
  yield* actor.send(new SendEmail({ email: "test@example.com", message: "Hello, World!" }))
  yield* actor.send(new Shutdown())
})

pipe(
  program,
  Effect.scoped,
  runMain
)
