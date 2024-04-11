import * as DevTools from "@effect/experimental/DevTools"
import * as Schema from "@effect/schema/Schema"
import * as Pg from "@effect/sql-pg"
import { Config, Effect, Layer } from "effect"
import { pipe } from "effect/Function"

class Person extends Schema.Class<Person>("Person")({
  id: Schema.number,
  name: Schema.string,
  createdAt: Schema.DateFromSelf
}) {}

const InsertPersonSchema = pipe(
  Schema.struct(Person.fields),
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
      Id: Schema.number,
      Result: Person,
      ResultId: (result) => result.id,
      execute: (ids) => sql`SELECT * FROM people WHERE id IN ${sql(ids)}`
    })
  )

  const GetByName = yield* _(
    Pg.resolver.grouped("GetPersonByName", {
      Request: Schema.string,
      RequestGroupKey: (_) => _,
      Result: Person,
      ResultGroupKey: (_) => _.name,
      execute: (ids) => sql`SELECT * FROM people WHERE name IN ${sql(ids)}`
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
  transformQueryNames: Config.succeed(Pg.transform.camelToSnake),
  transformResultNames: Config.succeed(Pg.transform.snakeToCamel)
})

pipe(
  program,
  Effect.provide(PgLive.pipe(
    Layer.provide(DevTools.layer())
  )),
  Effect.tapErrorCause(Effect.logError),
  Effect.runFork
)
