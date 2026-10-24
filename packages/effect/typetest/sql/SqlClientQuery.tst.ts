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
    },
    profiles: {
      id: { INTEGER: null },
      user_id: { INTEGER: null },
      bio: { TEXT: null },
      note: { TEXT: null, NULL: null }
    },
    groups: {
      group_id: { INTEGER: null },
      title: { TEXT: null }
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

  it("resolves joined tables, aliases and self joins", () => {
    expect(query("SELECT u.id AS userId, p.bio, note FROM users AS u JOIN profiles p ON u.id = p.user_id")).type.toBe<
      Statement<{
        readonly userId: number
        readonly bio: string
        readonly note: string | null
      }>
    >()
    expect(
      query(
        "SELECT child.id AS childId, parent.name AS parentName FROM users child INNER JOIN users AS parent ON child.id = parent.id"
      )
    ).type.toBe<
      Statement<{
        readonly childId: number
        readonly parentName: string
      }>
    >()
  })

  it("adds null to the unmatched side of outer joins without narrowing in WHERE", () => {
    expect(
      query(
        "SELECT u.name, p.bio, p.note FROM users u LEFT JOIN profiles p ON u.id = p.user_id WHERE p.bio IS NOT NULL"
      )
    ).type.toBe<
      Statement<{
        readonly name: string
        readonly bio: string | null
        readonly note: string | null
      }>
    >()
    expect(
      query(
        "SELECT users.name, profiles.bio, profiles.note FROM users RIGHT JOIN profiles ON users.id = profiles.user_id"
      )
    ).type.toBe<
      Statement<{
        readonly name: string | null
        readonly bio: string
        readonly note: string | null
      }>
    >()
    expect(
      query(
        "SELECT u.id AS userId, p.id AS profileId, p.bio FROM users u FULL OUTER JOIN profiles p ON u.id = p.user_id"
      )
    ).type.toBe<
      Statement<{
        readonly userId: number | null
        readonly profileId: number | null
        readonly bio: string | null
      }>
    >()
  })

  it("retains earlier nullability and widens every preceding source in a chained right join", () => {
    expect(
      query(
        "SELECT u.name, p.bio, owner.name AS ownerName FROM users u LEFT JOIN profiles p ON u.id = p.user_id INNER JOIN users owner ON owner.id = p.user_id"
      )
    ).type.toBe<
      Statement<{
        readonly name: string
        readonly bio: string | null
        readonly ownerName: string
      }>
    >()
    expect(
      query(
        "SELECT u.name, p.bio, g.title FROM users u JOIN profiles p ON u.id = p.user_id RIGHT OUTER JOIN groups g ON g.group_id = u.id"
      )
    ).type.toBe<
      Statement<{
        readonly name: string | null
        readonly bio: string | null
        readonly title: string
      }>
    >()
  })

  it("expands stars using each source's nullability and rejects duplicate result names", () => {
    expect(query("SELECT p.* FROM users AS u LEFT OUTER JOIN profiles AS p ON u.id = p.user_id")).type.toBe<
      Statement<{
        readonly id: number | null
        readonly user_id: number | null
        readonly bio: string | null
        readonly note: string | null
      }>
    >()
    expect(query("SELECT * FROM users CROSS JOIN groups")).type.toBe<
      Statement<{
        readonly id: number
        readonly name: string
        readonly email: string | null
        readonly age: number
        readonly group_id: number
        readonly title: string
      }>
    >()
    expect(query).type.not.toBeCallableWith("SELECT * FROM users JOIN profiles ON users.id = profiles.user_id")
    expect(query).type.not.toBeCallableWith("SELECT u.id, p.id FROM users u JOIN profiles p ON u.id = p.user_id")
  })

  it("accumulates parameters from every ON, WHERE and pagination clause", () => {
    const text =
      "SELECT u.id, p.bio FROM users u LEFT JOIN profiles p ON u.id = p.user_id AND p.bio = :bio AND p.note IS NULL INNER JOIN groups g ON g.group_id = u.id AND g.title = :title WHERE p.bio = :selectedBio AND u.age >= :age LIMIT :take OFFSET :skip"
    expect(query).type.toBeCallableWith(text, {
      bio: "bio",
      title: "group",
      selectedBio: null,
      age: 18,
      take: 10,
      skip: 0
    })
    expect(query).type.not.toBeCallableWith(text, {
      title: "group",
      selectedBio: null,
      age: 18,
      take: 10,
      skip: 0
    })
    expect(query).type.not.toBeCallableWith(text, {
      bio: "bio",
      selectedBio: null,
      age: 18,
      take: 10,
      skip: 0
    })
    expect(query).type.not.toBeCallableWith(text, {
      bio: null,
      title: "group",
      selectedBio: null,
      age: 18,
      take: 10,
      skip: 0
    })
  })

  it("checks ON parameters before the current outer join widens its sources", () => {
    const text = "SELECT u.id FROM users u FULL JOIN profiles p ON u.name = :name AND p.bio = :bio"
    expect(query).type.toBeCallableWith(text, { name: "name", bio: "bio" })
    expect(query).type.not.toBeCallableWith(text, { name: null, bio: "bio" })
    expect(query).type.not.toBeCallableWith(text, { name: "name", bio: null })
    expect(query).type.toBeCallableWith(
      "SELECT u.id FROM users u LEFT JOIN profiles p ON u.id = p.user_id JOIN groups g ON p.bio = :bio AND g.title IS NOT NULL",
      { bio: null }
    )
  })

  it("rejects ambiguous columns and duplicate source aliases", () => {
    expect(query).type.not.toBeCallableWith("SELECT id FROM users u JOIN profiles p ON u.id = p.user_id")
    expect(query).type.not.toBeCallableWith("SELECT u.id FROM users u JOIN profiles p ON id = p.user_id")
    expect(query).type.not.toBeCallableWith(
      "SELECT u.id FROM users u JOIN profiles p ON u.id = p.user_id WHERE id = :id",
      {
        id: 1
      }
    )
    expect(query).type.not.toBeCallableWith("SELECT u.id FROM users u JOIN profiles p ON u.id = p.user_id ORDER BY id")
    expect(query).type.not.toBeCallableWith("SELECT u.id FROM users u JOIN profiles u ON u.id = u.user_id")
    expect(query).type.not.toBeCallableWith("SELECT u.id FROM users u JOIN profiles U ON u.id = U.user_id")
  })

  it("rejects unavailable qualifiers, invalid join columns and unsupported join conditions", () => {
    expect(query).type.not.toBeCallableWith("SELECT missing.id FROM users u JOIN profiles p ON u.id = p.user_id")
    expect(query).type.not.toBeCallableWith("SELECT users.id FROM users u JOIN profiles p ON u.id = p.user_id")
    expect(query).type.not.toBeCallableWith("SELECT u.id FROM users u JOIN profiles p ON u.id = missing.user_id")
    expect(query).type.not.toBeCallableWith(
      "SELECT u.id FROM users u JOIN profiles p ON u.id = next.user_id JOIN profiles next ON p.id = next.id"
    )
    expect(query).type.not.toBeCallableWith("SELECT u.id FROM users u JOIN profiles p ON u.id = p.missing")
    expect(query).type.not.toBeCallableWith("SELECT u.id FROM users u JOIN profiles p")
    expect(query).type.not.toBeCallableWith("SELECT u.id FROM users u CROSS JOIN profiles p ON u.id = p.user_id")
    expect(query).type.not.toBeCallableWith("SELECT u.id FROM users u JOIN profiles p USING (id)")
    expect(query).type.not.toBeCallableWith("SELECT users.id FROM users NATURAL JOIN profiles")
    expect(query).type.not.toBeCallableWith(
      "SELECT u.id FROM users u JOIN profiles p ON u.id = p.user_id OR p.id = u.id"
    )
    expect(query).type.not.toBeCallableWith("SELECT u.id FROM users u JOIN profiles p ON u.id = p.user_id + :offset", {
      offset: 1
    })
  })

  it("checks ambiguity without case while preserving distinct result keys", () => {
    const caseSchema = {
      ...schema,
      tables: {
        left_side: { id: { INTEGER: null } },
        right_side: { ID: { TEXT: null } }
      }
    }
    class CaseDatabase extends SqlClient.Service<CaseDatabase>()("test/CaseDatabase", { schema: caseSchema }) {}
    Effect.gen(function*() {
      const caseQuery = yield* CaseDatabase
      expect(caseQuery).type.not.toBeCallableWith("SELECT id FROM left_side CROSS JOIN right_side")
      expect(caseQuery).type.not.toBeCallableWith("SELECT ID FROM left_side CROSS JOIN right_side")
      expect(caseQuery("SELECT * FROM left_side CROSS JOIN right_side")).type.toBe<
        Statement<{ readonly id: number; readonly ID: string }>
      >()
    })
  })

  it("displays selected rows without parser helper types", () => {
    Effect.gen(function*() {
      const users = yield* query("SELECT id AS userId, name, email FROM users")
      // @ts-expect-error Type 'readonly { readonly userId: number; readonly name: string; readonly email: string | null; }[]'
      const displayed: never = users
      void displayed

      const joined = yield* query("SELECT u.id AS userId, p.bio FROM users u LEFT JOIN profiles p ON u.id = p.user_id")
      // @ts-expect-error Type 'readonly { readonly userId: number; readonly bio: string | null; }[]'
      const displayedJoin: never = joined
      void displayedJoin
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
    expect(query).type.not.toBeCallableWith("SELECT users.id FROM users LEFT JOIN missing ON users.id = missing.id")
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
