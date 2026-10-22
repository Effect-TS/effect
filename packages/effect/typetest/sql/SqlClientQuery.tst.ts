import * as Effect from "effect/Effect"
import type * as Layer from "effect/Layer"
import * as SqlClient from "effect/sql/SqlClient"
import type { SqlError } from "effect/sql/SqlError"
import type { Statement } from "effect/sql/Statement"
import { describe, expect, it } from "tstyche"

declare const client: SqlClient.SqlClient
declare const dynamic: string
declare const union: "SELECT id FROM users" | "SELECT name FROM users"

// No `as const`: native JSON imports also widen the version and dialect values.
const schema = {
  version: 2,
  dialect: "sqlite",
  tables: {
    users: {
      id: { INTEGER: null },
      name: { TEXT: null },
      email: { TEXT: null, NULL: null },
      age: { INTEGER: null }
    }
  }
}
class Database extends SqlClient.Service<Database>()("test/SqlClientQuery/Database", { schema }) {}

const acquireQuery = Effect.service(Database)
declare const query: Effect.Success<typeof acquireQuery>

describe("SqlClient.Service", () => {
  it("requires the database service and binds its layer to a SQL client", () => {
    expect(acquireQuery).type.toBe<
      Effect.Effect<SqlClient.Query<typeof schema>, never, Database>
    >()
    expect(Database.layer).type.toBe<Layer.Layer<Database, never, SqlClient.SqlClient>>()
    const withDatabase = Effect.provide(acquireQuery, Database.layer)
    expect(withDatabase).type.toBe<
      Effect.Effect<SqlClient.Query<typeof schema>, never, SqlClient.SqlClient>
    >()
    const withClient = Effect.provideService(acquireQuery, SqlClient.SqlClient, client)
    expect(withClient).type.toBe<Effect.Effect<SqlClient.Query<typeof schema>, never, Database>>()
    expect(Effect.provideService(withDatabase, SqlClient.SqlClient, client)).type.toBe<
      Effect.Effect<SqlClient.Query<typeof schema>>
    >()
    const program = Effect.gen(function*() {
      const sql = yield* Database
      return yield* sql("SELECT id FROM users")
    })
    expect(program).type.toBe<
      Effect.Effect<ReadonlyArray<{ readonly id: number }>, SqlError, Database>
    >()
    expect(Effect.runPromise).type.not.toBeCallableWith(program)
    class OtherDatabase extends SqlClient.Service<OtherDatabase>()("test/OtherDatabase", { schema }) {}
    const wrongDatabase = program.pipe(
      Effect.provide(OtherDatabase.layer),
      Effect.provideService(SqlClient.SqlClient, client)
    )
    expect(wrongDatabase).type.toBe<
      Effect.Effect<ReadonlyArray<{ readonly id: number }>, SqlError, Database>
    >()
  })

  it("infers projected fields, aliases and nullability", () => {
    const statement = query("SELECT users.id AS userId, name, email FROM users")
    expect(statement).type.toBe<
      Statement<{
        readonly userId: number
        readonly name: string
        readonly email: string | null
      }>
    >()
    expect(Effect.asVoid(statement)).type.toBe<Effect.Effect<void, SqlError>>()
    expect(query("SELECT email FROM users WHERE email IS NOT NULL")).type.toBe<
      Statement<{ readonly email: string | null }>
    >()
  })

  it("displays selected rows without parser helper types", () => {
    Effect.gen(function*() {
      const users = yield* query("SELECT id AS userId, name, email FROM users")
      // @ts-expect-error Type 'readonly { readonly userId: number; readonly name: string; readonly email: string | null; }[]'
      const displayed: never = users
      void displayed
    })
  })

  it("infers named parameters and pagination", () => {
    const text = "SELECT id FROM users WHERE age >= :age ORDER BY name LIMIT :take OFFSET :skip"
    expect(query).type.toBeCallableWith(text, { age: 18, take: 10, skip: 0 })
    expect(query).type.not.toBeCallableWith(text, { age: "18", take: 10, skip: 0 })
    expect(query).type.not.toBeCallableWith(text, { age: 18, take: 10 })
    expect(query).type.toBeCallableWith("SELECT id FROM users WHERE email = :email", { email: null })
    expect(query).type.not.toBeCallableWith("SELECT id FROM users WHERE id = :id", { id: null })
    expect(query).type.not.toBeCallableWith("SELECT id FROM users WHERE id = :id")
    expect(query).type.not.toBeCallableWith("SELECT id FROM users WHERE id = :id", { id: 1, extra: 2 })
  })

  it("checks repeated parameter types", () => {
    expect(query).type.toBeCallableWith("SELECT id FROM users WHERE id = :n AND age >= :n", { n: 1 })
    expect(query).type.not.toBeCallableWith("SELECT id FROM users WHERE id = :n AND name = :n", { n: 1 })
  })

  it("rejects unknown names, unsupported syntax and ambiguous literals", () => {
    expect(query).type.not.toBeCallableWith("SELECT missing FROM users")
    expect(query).type.not.toBeCallableWith("SELECT id FROM missing")
    expect(query).type.not.toBeCallableWith("SELECT id FROM users ORDER BY missing")
    expect(query).type.not.toBeCallableWith("SELECT id FROM users WHERE missing = :value", { value: 1 })
    expect(query).type.not.toBeCallableWith("SELECT id FROM users LEFT JOIN other ON users.id = other.id")
    expect(query).type.not.toBeCallableWith("SELECT id, id FROM users")
    expect(query).type.not.toBeCallableWith("SELECT id FROM users WHERE id = 1")
    expect(query).type.not.toBeCallableWith(dynamic)
    expect(query).type.not.toBeCallableWith(union)
  })

  it("rejects column names that SQLite can interpret as literals", () => {
    const literalSchema = {
      ...schema,
      tables: {
        users: {
          id: { INTEGER: null },
          null: { TEXT: null },
          true: { TEXT: null },
          FALSE: { TEXT: null },
          current_date: { INTEGER: null },
          current_time: { INTEGER: null },
          CURRENT_TIMESTAMP: { INTEGER: null }
        }
      }
    }
    class LiteralDatabase extends SqlClient.Service<LiteralDatabase>()("test/LiteralDatabase", {
      schema: literalSchema
    }) {}
    Effect.gen(function*() {
      const literals = yield* LiteralDatabase
      expect(literals).type.not.toBeCallableWith("SELECT null FROM users")
      expect(literals).type.not.toBeCallableWith("SELECT true FROM users")
      expect(literals).type.not.toBeCallableWith("SELECT FALSE FROM users")
      expect(literals).type.not.toBeCallableWith("SELECT current_date FROM users")
      expect(literals).type.not.toBeCallableWith("SELECT current_time FROM users")
      expect(literals).type.not.toBeCallableWith("SELECT CURRENT_TIMESTAMP FROM users")
      expect(literals).type.not.toBeCallableWith("SELECT users.current_date FROM users")
      expect(literals).type.not.toBeCallableWith("SELECT id FROM users WHERE null = :value", { value: "value" })
      expect(literals).type.not.toBeCallableWith("SELECT id FROM users ORDER BY current_date")
      expect(literals).type.toBeCallableWith("SELECT * FROM users")
      expect(literals).type.toBeCallableWith("SELECT id AS current_date FROM users")
    })
  })

  it("derives changed column types from the supplied snapshot", () => {
    const changedSchema = {
      ...schema,
      tables: { users: { id: { TEXT: null }, email: { TEXT: null } } }
    }
    class ChangedDatabase extends SqlClient.Service<ChangedDatabase>()("test/ChangedDatabase", {
      schema: changedSchema
    }) {}
    Effect.gen(function*() {
      const changed = yield* ChangedDatabase
      expect(changed("SELECT * FROM users")).type.toBe<
        Statement<{
          readonly id: string
          readonly email: string
        }>
      >()
      expect(changed).type.toBeCallableWith("SELECT id FROM users WHERE id = :id", { id: "one" })
      expect(changed).type.not.toBeCallableWith("SELECT id FROM users WHERE id = :id", { id: 1 })
    })
    const invalidSchema = {
      ...schema,
      tables: { users: { id: { ANY: null } } }
    }
    expect(SqlClient.Service<never>()).type.not.toBeCallableWith("test/InvalidDatabase", { schema: invalidSchema })
    const blobSchema = {
      ...schema,
      tables: { users: { value: { BLOB: null } } }
    }
    expect(SqlClient.Service<never>()).type.not.toBeCallableWith("test/BlobDatabase", { schema: blobSchema })
    const alternative: { id: { INTEGER: null } } | { id: { TEXT: null } } = Math.random() ?
      { id: { INTEGER: null } } :
      { id: { TEXT: null } }
    const alternativeSchema = { ...schema, tables: { users: alternative } }
    class AlternativeDatabase
      extends SqlClient.Service<AlternativeDatabase>()("test/AlternativeDatabase", { schema: alternativeSchema })
    {}
    Effect.gen(function*() {
      const alternatives = yield* AlternativeDatabase
      expect(alternatives("SELECT id FROM users")).type.toBe<Statement<{ readonly id: number | string }>>()
    })
  })
})
