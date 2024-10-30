import * as Sql from "@effect/sql";
import * as Pg from "@effect/sql-pg";
import { Config, Effect, Console } from "effect";

const SqlLive = Pg.client.layer({ database: Config.succeed("inventory") });
const program = Effect.gen(function* (_) {
  yield* Effect.logInfo("Attempting to connect to SQL...");
  
  const sql = yield* Sql.client.Client.pipe(
    Effect.tapError((e) => Effect.logError(`SQL Connection Error: ${e}`))
  );
  
  yield* Effect.logInfo("Connected to SQL!");
  const people = yield* sql<{
    readonly id: number;
    readonly name: string;
  }>`SELECT id, name FROM people`;


  yield* Effect.logInfo(`Got ${people.length} results!`);
}).pipe(
  Effect.catchAll((error) => 
    Effect.logError(`Program Error: ${error}`).pipe(
      Effect.zipRight(Effect.fail(error))
    )
  ),
  Effect.scoped
);

program.pipe(
  Effect.provide(SqlLive),
  Effect.catchAllCause((cause) => 
    Console.error(`Fatal Error: ${cause}`)
  ),
  Effect.runPromise
);
