import * as DevTools from "@effect/experimental/DevTools"
import * as Schema from "@effect/schema/Schema"
import * as Pg from "@effect/sql-pg"
import { Config, Effect, Layer, String } from "effect"

class Person extends Schema.Class<Person>("Person")({
  id: Schema.Number,
  name: Schema.String,
  createdAt: Schema.DateFromSelf
}) {}

const InsertPersonSchema = Schema.Struct(Person.fields).pipe(
  Schema.omit("id", "createdAt")
)

const program = Effect.gen(function*(_) {
  const sql = yield* _(Pg.client.PgClient)

  const Insert = yield* _(
    Pg.resolver.ordered("InsertPerson", {
      Request: InsertPersonSchema,
      Result: Person,
      execute: (requests) => sql`INSERT INTO people ${sql.insert(requests)} RETURNING people.*`
    })
  )

  const GetById = yield* _(
    Pg.resolver.findById("GetPersonById", {
      Id: Schema.Number,
      Result: Person,
      ResultId: (result) => result.id,
      execute: (ids) => sql`SELECT * FROM people WHERE id IN ${sql.in(ids)}`
    })
  )

  const GetByName = yield* _(
    Pg.resolver.grouped("GetPersonByName", {
      Request: Schema.String,
      RequestGroupKey: (_) => _,
      Result: Person,
      ResultGroupKey: (_) => _.name,
      execute: (ids) => sql<{}>`SELECT * FROM people WHERE name IN ${sql.in(ids)}`
    })
  )

  const inserted = yield* _(
    Effect.all(
      [
        Insert.execute({ name: "John Doe" }),
        Insert.execute({ name: "Joe Bloggs" })
      ],
      { batching: true }
    )
  )

  console.log(
    yield* _(
      Effect.all(
        [GetById.execute(inserted[0].id), GetById.execute(inserted[1].id)],
        { batching: true }
      )
    )
  )

  console.log(
    yield* _(
      Effect.forEach(
        ["John Doe", "Joe Bloggs", "John Doe"],
        (id) => GetByName.execute(id),
        { batching: true }
      )
    )
  )
})

const PgLive = Pg.client.layer({
  database: Config.succeed("effect_pg_dev"),
  transformQueryNames: Config.succeed(String.camelToSnake),
  transformResultNames: Config.succeed(String.snakeToCamel)
})

program.pipe(
  Effect.provide(PgLive.pipe(
    Layer.provide(DevTools.layer())
  )),
  Effect.tapErrorCause(Effect.logError),
  Effect.runFork
)
