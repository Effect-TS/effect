import { Machine } from "@effect/experimental"
import { runMain } from "@effect/platform-node/NodeRuntime"
import { Data, Effect, List, Request, Schedule } from "effect"

class SendError extends Data.TaggedError("SendError")<{
  readonly email: string
  readonly reason: string
}> {}

class SendEmail extends Request.TaggedClass("SendEmail")<void, SendError, {
  readonly email: string
  readonly message: string
}> {}

class ProcessEmail extends Request.TaggedClass("ProcessEmail")<void, never, {}> {}

class Shutdown extends Request.TaggedClass("Shutdown")<void, never, {}> {}

const mailer = Machine.makeWith<List.List<SendEmail>>()((_, previous) =>
  Effect.gen(function*(_) {
    const ctx = yield* _(Machine.MachineContext)
    const state = previous ?? List.empty()

    if (List.isCons(state)) {
      yield* _(ctx.unsafeSend(new ProcessEmail()), Effect.replicateEffect(List.size(state)))
    }

    return Machine.procedures.make(state).pipe(
      Machine.procedures.addPrivate<ProcessEmail>()("ProcessEmail", ({ state }) =>
        Effect.gen(function*(_) {
          if (List.isNil(state)) {
            return [void 0, state]
          }
          const req = state.head
          yield* _(Effect.log(`Sending email to ${req.email}`), Effect.delay(500))
          return [void 0, state.tail]
        })),
      Machine.procedures.add<SendEmail>()("SendEmail", (ctx) =>
        ctx.send(new ProcessEmail()).pipe(
          Effect.as([void 0, List.append(ctx.state, ctx.request)])
        )),
      Machine.procedures.add<Shutdown>()("Shutdown", () =>
        Effect.log("Shutting down").pipe(
          Effect.zipRight(Effect.interrupt)
        ))
    )
  })
).pipe(
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
