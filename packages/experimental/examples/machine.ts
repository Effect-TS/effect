import { Machine } from "@effect/experimental"
import { runMain } from "@effect/platform-node/NodeRuntime"
import { Data, Effect, List, pipe, Request, Schedule } from "effect"

class SendError extends Data.TaggedError("SendError")<{
  readonly email: string
  readonly reason: string
}> {}

class SendEmail extends Request.TaggedClass("SendEmail")<
  void,
  SendError,
  {
    readonly email: string
    readonly message: string
  }
> {}

class ProcessEmail extends Request.TaggedClass("ProcessEmail")<
  void,
  never,
  {}
> {}

class Shutdown extends Request.TaggedClass("Shutdown")<
  void,
  never,
  {}
> {}

const mailer = Machine.makeWith<List.List<SendEmail>>()((_, previous) =>
  Effect.gen(function*() {
    const ctx = yield* Machine.MachineContext
    const state = previous ?? List.empty()

    if (List.isCons(state)) {
      yield* ctx.unsafeSend(new ProcessEmail()).pipe(Effect.replicateEffect(List.size(state)))
    }

    return Machine.procedures.make(state).pipe(
      Machine.procedures.addPrivate<ProcessEmail>()("ProcessEmail", ({ state }) =>
        Effect.gen(function*() {
          if (List.isNil(state)) {
            return [void 0, state]
          }
          const req = state.head
          yield* Effect.log(`Sending email to ${req.email}`).pipe(Effect.delay(500))
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
