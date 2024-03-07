---
"@effect/experimental": patch
---

add Machine module to experimental

The Machine module can be used to create effectful state machines. Here is an
example of a machine that sends emails:

```ts
import { Machine } from "@effect/experimental";
import { runMain } from "@effect/platform-node/NodeRuntime";
import { Schema } from "@effect/schema";
import { Effect, List, Schedule } from "effect";

class SendError extends Schema.TaggedError<SendError>()("SendError", {
  email: Schema.string,
  reason: Schema.string,
}) {}

class SendEmail extends Schema.TaggedRequest<SendEmail>()(
  "SendEmail",
  SendError,
  Schema.void,
  {
    email: Schema.string,
    message: Schema.string,
  }
) {}

class ProcessEmail extends Schema.TaggedRequest<ProcessEmail>()(
  "ProcessEmail",
  Schema.never,
  Schema.void,
  {}
) {}

class Shutdown extends Schema.TaggedRequest<Shutdown>()(
  "Shutdown",
  Schema.never,
  Schema.void,
  {}
) {}

const mailer = Machine.makeSerializable(
  { state: Schema.list(SendEmail) },
  (_, previous) =>
    Effect.gen(function* (_) {
      const ctx = yield* _(Machine.MachineContext);
      const state = previous ?? List.empty();

      if (List.isCons(state)) {
        yield* _(
          ctx.unsafeSend(new ProcessEmail()),
          Effect.replicateEffect(List.size(state))
        );
      }

      return Machine.procedures.make(state).pipe(
        Machine.procedures.addPrivate(
          ProcessEmail,
          "ProcessEmail",
          ({ state }) =>
            Effect.gen(function* (_) {
              if (List.isNil(state)) {
                return [void 0, state];
              }
              const req = state.head;
              yield* _(
                Effect.log(`Sending email to ${req.email}`),
                Effect.delay(500)
              );
              return [void 0, state.tail];
            })
        ),
        Machine.procedures.add(SendEmail, "SendEmail", (ctx) =>
          ctx
            .send(new ProcessEmail())
            .pipe(Effect.as([void 0, List.append(ctx.state, ctx.request)]))
        ),
        Machine.procedures.add(Shutdown, "Shutdown", () =>
          Effect.log("Shutting down").pipe(Effect.zipRight(Effect.interrupt))
        )
      );
    })
).pipe(Machine.retry(Schedule.forever));

Effect.gen(function* (_) {
  const actor = yield* _(Machine.boot(mailer));
  yield* _(
    actor.send(
      new SendEmail({ email: "test@example.com", message: "Hello, World!" })
    )
  );
  yield* _(
    actor.send(
      new SendEmail({ email: "test@example.com", message: "Hello, World!" })
    )
  );
  yield* _(
    actor.send(
      new SendEmail({ email: "test@example.com", message: "Hello, World!" })
    )
  );
  yield* _(actor.send(new Shutdown()));
}).pipe(Effect.scoped, runMain);
```
