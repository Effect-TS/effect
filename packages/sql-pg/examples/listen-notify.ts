import { PgClient } from "@effect/sql-pg"
import { Console, Effect, Stream } from "effect"

const program = Effect.gen(function*() {
  const sql = yield* PgClient.PgClient

  // start listening for notifications on the channel
  yield* sql.listen("channel_name").pipe(
    Stream.tap((message) => Console.log("Received message", message)),
    Stream.runDrain,
    Effect.forkScoped
  )

  // send 5 notifications to the channel
  yield* sql.notify("channel_name", "Hello, world!").pipe(
    Effect.tap(() => Effect.sleep("1 second")),
    Effect.replicateEffect(5)
  )
}).pipe(Effect.scoped)

const PgLive = PgClient.layer({
  database: "postgres",
  username: "postgres"
})

program.pipe(
  Effect.provide(PgLive),
  Effect.tapErrorCause(Effect.logError),
  Effect.runFork
)
