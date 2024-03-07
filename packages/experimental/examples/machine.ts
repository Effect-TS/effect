import { Machine } from "@effect/experimental"
import { runMain } from "@effect/platform-node/NodeRuntime"
import { Schema } from "@effect/schema"
import { Effect, List, Schedule } from "effect"

class SendError extends Schema.TaggedError<SendError>()("SendError", {
  email: Schema.string,
  reason: Schema.string
}) {}

class SendEmail extends Schema.TaggedRequest<SendEmail>()("SendEmail", SendError, Schema.void, {
  email: Schema.string,
  message: Schema.string
}) {}

class ProcessEmail extends Schema.TaggedRequest<ProcessEmail>()("ProcessEmail", Schema.never, Schema.void, {}) {}

class Shutdown extends Schema.TaggedRequest<Shutdown>()("Shutdown", Schema.never, Schema.void, {}) {}

const mailer = Machine.makeSerializable({
  state: Schema.list(SendEmail)
}, (_, previous) =>
  Machine.procedures.make(previous ?? List.empty()).pipe(
    Machine.procedures.addPrivate(ProcessEmail, "ProcessEmail", (_req, state) =>
      Effect.gen(function*(_) {
        if (List.isNil(state)) {
          return [void 0, state]
        }
        const req = state.head
        yield* _(Effect.log(`Sending email to ${req.email}`), Effect.delay(500))
        return [void 0, state.tail]
      })),
    Machine.procedures.add(SendEmail, "SendEmail", (req, state, ctx) =>
      ctx.send(new ProcessEmail()).pipe(
        Effect.as([void 0, List.append(state, req)])
      )),
    Machine.procedures.add(Shutdown, "Shutdown", () =>
      Effect.log("Shutting down").pipe(
        Effect.zipRight(Effect.interrupt)
      ))
  )).pipe(
    Machine.addInitializer((_, ctx) =>
      List.isCons(_) ?
        ctx.send(new ProcessEmail()).pipe(
          Effect.replicateEffect(List.size(_))
        ) :
        Effect.unit
    ),
    Machine.retry(Schedule.forever)
  )

Effect.gen(function*(_) {
  const actor = yield* _(Machine.boot(mailer))
  yield* _(actor.send(new SendEmail({ email: "test@example.com", message: "Hello, World!" })))
  yield* _(actor.send(new SendEmail({ email: "test@example.com", message: "Hello, World!" })))
  yield* _(actor.send(new SendEmail({ email: "test@example.com", message: "Hello, World!" })))
  yield* _(actor.send(new Shutdown()))
}).pipe(
  Effect.scoped,
  runMain
)
