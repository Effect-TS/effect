import * as DevTools from "@effect/experimental/DevTools"
import { SqlClient, SqlResolver } from "@effect/sql"
import { PgClient } from "@effect/sql-pg"
import { Effect, Layer, String } from "effect"
import * as Schema from "effect/Schema"

class Person extends Schema.Class<Person>("Person")({
  id: Schema.Number,
  name: Schema.String,
  createdAt: Schema.DateFromSelf
}) {}

const InsertPersonSchema = Schema.Struct(Person.fields).pipe(
  Schema.omit("id", "createdAt")
)

const program = Effect.gen(function*() {
  const sql = yield* SqlClient.SqlClient

  yield* sql`TRUNCATE TABLE people RESTART IDENTITY CASCADE`

  const Insert = yield* SqlResolver.ordered("InsertPerson", {
    Request: InsertPersonSchema,
    Result: Person,
    execute: (requests) => sql`INSERT INTO people ${sql.insert(requests)} RETURNING people.*`
  })

  const GetById = yield* SqlResolver.findById("GetPersonById", {
    Id: Schema.Number,
    Result: Person,
    ResultId: (result) => result.id,
    execute: (ids) => sql`SELECT * FROM people WHERE id IN ${sql.in(ids)}`
  })

  const GetByName = yield* SqlResolver.grouped("GetPersonByName", {
    Request: Schema.String,
    RequestGroupKey: (_) => _,
    Result: Person,
    ResultGroupKey: (_) => _.name,
    execute: (ids) => sql<{}>`SELECT * FROM people WHERE name IN ${sql.in(ids)}`
  })

  const inserted = yield* sql.withTransaction(
    Effect.all(
      [
        Insert.execute({ name: "John Doe" }),
        Insert.execute({ name: "Joe Bloggs" })
      ],
      { batching: true }
    )
  )

  yield* sql`SELECT * FROM people`.pipe(
    Effect.andThen(Effect.fail("boom")),
    sql.withTransaction,
    Effect.ignore
  )

  console.log(
    yield* Effect.all(
      [GetById.execute(inserted[0].id), GetById.execute(inserted[1].id)],
      { batching: true }
    )
  )

  console.log(
    yield* Effect.forEach(
      ["John Doe", "Joe Bloggs", "John Doe"],
      (id) => GetByName.execute(id),
      { batching: true }
    )
  )
})

const PgLive = PgClient.layer({
  database: "effect_pg_dev",
  transformQueryNames: String.camelToSnake,
  transformResultNames: String.snakeToCamel
})

program.pipe(
  Effect.provide(PgLive.pipe(
    Layer.provide(DevTools.layer())
  )),
  Effect.tapErrorCause(Effect.logError),
  Effect.runFork
)
