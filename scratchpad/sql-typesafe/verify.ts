import * as NodeFileSystem from "@effect/platform-node/NodeFileSystem"
import * as SqliteClient from "@effect/sql-sqlite-node/SqliteClient"
import * as Effect from "effect/Effect"
import * as Migrator from "effect/sql/Migrator"
import * as SqlClient from "effect/sql/SqlClient"
import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import schema from "./_schema.json" with { type: "json" }
import { migrations } from "./migrations.ts"

class Database extends SqlClient.Service<Database>()("scratchpad/verify/Database", { schema }) {}

const root = fileURLToPath(new URL("./", import.meta.url))
const directory = mkdtempSync(join(root, ".verify-"))
const schemaPath = join(directory, "_schema.json")
const compiler = join(root, "../node_modules/typescript/bin/tsc")
const records = (rows: ReadonlyArray<object>) => rows.map((row) => ({ ...row }))

const run = (args: Array<string>) => {
  const result = spawnSync(process.execPath, args, { cwd: root, encoding: "utf8", timeout: 30_000 })
  if (result.error) throw result.error
  assert.equal(result.signal, null, result.stderr)
  return { status: result.status, output: result.stdout + result.stderr }
}

try {
  await Effect.gen(function*() {
    const options = { loader: migrations, schemaDirectory: directory }
    assert.deepEqual(yield* Migrator.runWithSnapshot(options), [[1, "create_users"], [2, "create_profiles"]])
    const initial = readFileSync(schemaPath, "utf8")
    assert.equal(initial, readFileSync(join(root, "_schema.json"), "utf8"), "Regenerate the demo snapshot")
    rmSync(schemaPath)
    assert.deepEqual(yield* Migrator.runWithSnapshot(options), [])
    assert.equal(readFileSync(schemaPath, "utf8"), initial, "A no-op migration must refresh a missing snapshot")

    const query = yield* Database
    const ordered = query("SELECT id, name FROM users WHERE name = :name AND age >= :minimumAge", {
      minimumAge: 18,
      name: "Ada"
    })
    assert.deepEqual(ordered.compile(), [
      "SELECT id, name FROM users WHERE name = ? AND age >= ?",
      ["Ada", 18]
    ])
    assert.deepEqual(records(yield* ordered), [{ id: 1, name: "Ada" }])

    const repeated = query("SELECT id FROM users WHERE id = :id AND age > :id", { id: 1 })
    assert.deepEqual(repeated.compile()[1], [1, 1])
    assert.deepEqual(records(yield* repeated), [{ id: 1 }])
    assert.deepEqual(records(yield* query("SELECT email FROM users WHERE email IS NULL")), [{ email: null }])
    assert.deepEqual(
      records(
        yield* query("SELECT id FROM users ORDER BY id DESC LIMIT :take OFFSET :skip", {
          take: 1,
          skip: 0
        })
      ),
      [{ id: 3 }]
    )
    const injection = query("SELECT id FROM users WHERE name = :name", { name: "' OR 1=1 --" })
    assert.deepEqual(injection.compile(), ["SELECT id FROM users WHERE name = ?", ["' OR 1=1 --"]])
    assert.deepEqual(yield* injection, [])

    const left = query(
      `SELECT u.id AS userId, p.bio FROM users u
       LEFT JOIN profiles p ON u.id = p.user_id AND p.bio = :bio
       WHERE u.age >= :age ORDER BY u.id LIMIT :take OFFSET :skip`,
      { skip: 0, take: 2, age: 18, bio: "Analytical Engine" }
    )
    assert.deepEqual(left.compile()[1], ["Analytical Engine", 18, 2, 0])
    assert.deepEqual(records(yield* left), [{ userId: 1, bio: "Analytical Engine" }, { userId: 2, bio: null }])
    assert.deepEqual(
      records(yield* query("SELECT u.name, p.bio FROM users u JOIN profiles p ON u.id = p.user_id")),
      [{ name: "Ada", bio: "Analytical Engine" }]
    )
    assert.deepEqual(
      records(
        yield* query("SELECT u.name, p.bio FROM users u RIGHT JOIN profiles p ON u.id = p.user_id ORDER BY p.id")
      ),
      [{ name: "Ada", bio: "Analytical Engine" }, { name: null, bio: "No matching user" }]
    )
    assert.deepEqual(
      records(
        yield* query("SELECT u.name, p.bio FROM users u FULL JOIN profiles p ON u.id = p.user_id ORDER BY u.id, p.id")
      ),
      [
        { name: null, bio: "No matching user" },
        { name: "Ada", bio: "Analytical Engine" },
        { name: "Grace", bio: null },
        { name: "Sam", bio: null }
      ]
    )
    assert.equal(
      (yield* query("SELECT u.id AS userId, p.id AS profileId FROM users u CROSS JOIN profiles p")).length,
      6
    )
  }).pipe(
    Effect.provide(Database.layer),
    Effect.provide([NodeFileSystem.layer, SqliteClient.layer({ filename: ":memory:" })]),
    Effect.runPromise
  )

  const base = JSON.parse(readFileSync(join(root, "tsconfig.json"), "utf8"))
  writeFileSync(
    join(directory, "tsconfig.json"),
    JSON.stringify({
      ...base,
      compilerOptions: {
        ...base.compilerOptions,
        incremental: true,
        tsBuildInfoFile: join(directory, "check.tsbuildinfo")
      },
      include: [],
      files: ["query.ts"],
      references: base.references.map((reference: { path: string }) => ({ path: resolve(root, reference.path) }))
    })
  )
  writeFileSync(
    join(directory, "database.ts"),
    [
      "import * as SqlClient from 'effect/sql/SqlClient'",
      "import schema from './_schema.json' with { type: 'json' }",
      "export class Database extends SqlClient.Service<Database>()('verify/Database', { schema }) {}"
    ].join("\n")
  )

  let previousSource: string | undefined
  const check = (body: string) => {
    const source = [
      "import * as Effect from 'effect/Effect'",
      "import * as SqlClient from 'effect/sql/SqlClient'",
      "import { Database } from './database.ts'",
      "export const program = Effect.gen(function*() {",
      "  const raw = yield* SqlClient.SqlClient",
      "  const query = yield* Database",
      body,
      "})"
    ].join("\n")
    if (source !== previousSource) {
      writeFileSync(join(directory, "query.ts"), source)
      previousSource = source
    }
    return run([compiler, "-p", join(directory, "tsconfig.json"), "--pretty", "false"])
  }
  const accepts = (body: string) => {
    const result = check(body)
    assert.equal(result.status, 0, result.output)
  }
  const rejects = (body: string, message: RegExp, location = /query\.ts\(\d+,\d+\)/) => {
    const result = check(body)
    assert.equal(result.status, 2, result.output)
    assert.match(result.output, message)
    assert.match(
      result.output,
      location,
      "Diagnostics must refer to the query, database service, or schema"
    )
  }

  const valid = [
    "const rows = yield* query(`SELECT id, name, email FROM users WHERE age >= :age ORDER BY name LIMIT :take`, { age: 18, take: 10 })",
    "rows[0].id.toFixed()",
    "rows[0].name.toUpperCase()",
    "rows[0].email?.toLowerCase()"
  ].join("\n")
  accepts(valid)
  const joined = [
    "const rows = yield* query('SELECT u.id, p.bio FROM users u LEFT JOIN profiles p ON u.id = p.user_id')",
    "rows[0].id.toFixed()",
    "rows[0].bio?.toUpperCase()"
  ].join("\n")
  accepts(joined)
  rejects(joined + "; rows[0].bio.toUpperCase()", /possibly 'null'/)
  accepts(joined.replace("LEFT JOIN", "INNER JOIN") + "; rows[0].bio.toUpperCase()")
  rejects(
    "const users = yield* query('SELECT id AS userId, name, email FROM users'); const displayed: never = users",
    /Type 'readonly \{ readonly email: string \| null; readonly name: string; readonly userId: number; \}\[\]'/
  )
  accepts(
    "void Effect.runPromise(Database.pipe(Effect.provide(Database.layer), Effect.provideService(SqlClient.SqlClient, raw)))"
  )
  rejects(
    "void Effect.runPromise(Database.pipe(Effect.provideService(SqlClient.SqlClient, raw)))",
    /Database.*never/s
  )
  rejects(
    "void Effect.runPromise(Database.pipe(Effect.provide(Database.layer)))",
    /SqlClient.*never/s
  )
  accepts(
    "const rows = yield* query(`SELECT users.id AS userId, email FROM users WHERE email IS NOT NULL`); rows[0].userId.toFixed()"
  )
  accepts("const rows = yield* query(`SELECT users.* FROM users`); rows[0].age.toFixed()")
  accepts(
    "yield* query('select distinct name from users order by name desc, age asc limit :n offset :skip;', { n: 1, skip: 0 })"
  )
  accepts("yield* query('SELECT id FROM users WHERE email = :email', { email: null })")
  accepts("yield* query('SELECT id FROM users WHERE id = :n AND age >= :n', { n: 1 })")
  accepts("yield* raw`SELECT 1`; const unrelated = (text: TemplateStringsArray) => text[0]; unrelated`hello`")
  rejects("yield* query('SELECT id FROM users WHERE id = :id', { id: 'wrong' })", /string.*number/)
  rejects("yield* query('SELECT id FROM users WHERE id = :id', { id: null })", /null.*number/)
  rejects("yield* query('SELECT id FROM users WHERE id = :id')", /Expected 2 arguments/)
  rejects("yield* query('SELECT id FROM users WHERE id = :id', {})", /id.*missing/)
  rejects("yield* query('SELECT id FROM users WHERE id = :id', { id: 1, extra: 2 })", /extra.*does not exist/)
  rejects(
    "yield* query('SELECT id FROM users WHERE id = :same AND name = :same', { same: 1 })",
    /Incompatible uses of parameter :same/
  )
  rejects("const rows = yield* query('SELECT id FROM users'); rows[0].id.toUpperCase()", /TS2339.*toUpperCase/)
  rejects("const rows = yield* query('SELECT email FROM users'); rows[0].email.toLowerCase()", /possibly 'null'/)
  rejects("const rows = yield* query('SELECT id FROM users'); rows[0].name", /Property 'name' does not exist/)
  rejects("yield* query('SELECT missing FROM users')", /Unknown column missing/)
  rejects("yield* query('SELECT \"*\" FROM users')", /Unsupported SQL character/)
  rejects("yield* query('SELECT id FROM missing')", /Unknown table missing/)
  rejects(
    "yield* query('SELECT id FROM users LEFT JOIN other ON users.id = other.id')",
    /Unknown table other/
  )
  rejects(
    "yield* query('SELECT id FROM users u LEFT JOIN profiles p ON u.id = p.user_id')",
    /Ambiguous column id/
  )
  rejects("yield* query('SELECT users.id FROM users NATURAL JOIN profiles')", /Unsupported SQL near NATURAL/)
  rejects("yield* query('SELECT id, id FROM users')", /Duplicate result column/)
  rejects("yield* query('SELECT id FROM users WHERE id = :id', { id: raw.literal('1') })", /Fragment.*number/)
  rejects("yield* query('SELECT id FROM users ORDER BY missing')", /Unknown column missing/)
  rejects("yield* query('SELECT id FROM users WHERE missing = :value', { value: 1 })", /Unknown column missing/)
  rejects("yield* query('SELECT id FROM users; SELECT name FROM users')", /Unsupported SQL near/)
  rejects("const text: string = 'SELECT id FROM users'; yield* query(text)", /Use a SQL string literal/)
  rejects("const column: string = 'id'; yield* query(`SELECT ${column} FROM users`)", /SQL error/)
  rejects(
    "const text = Math.random() ? 'SELECT id FROM users' : 'SELECT name FROM users'; yield* query(text)",
    /Use one SQL literal/
  )

  // Reuse the same source and tsbuildinfo while only changing the schema.
  // Native JSON dependencies must invalidate TypeScript's incremental cache.
  accepts(valid)
  const original = readFileSync(schemaPath, "utf8")
  const changed = JSON.parse(original)
  changed.tables.users.name = { INTEGER: null }
  writeFileSync(schemaPath, JSON.stringify(changed))
  rejects(valid, /TS2339.*toUpperCase/)
  writeFileSync(schemaPath, original)
  const nullable = "const rows = yield* query('SELECT email FROM users'); rows[0].email.toLowerCase()"
  rejects(nullable, /possibly 'null'/)
  const nonNullable = JSON.parse(original)
  delete nonNullable.tables.users.email.NULL
  writeFileSync(schemaPath, JSON.stringify(nonNullable))
  accepts(nullable)
  writeFileSync(schemaPath, original)
  rejects(nullable, /possibly 'null'/)

  accepts(joined)
  const changedProfile = JSON.parse(original)
  changedProfile.tables.profiles.bio = { INTEGER: null }
  writeFileSync(schemaPath, JSON.stringify(changedProfile))
  rejects(joined, /TS2339.*toUpperCase/)
  writeFileSync(schemaPath, original)
  accepts(joined)

  const literals = JSON.parse(original)
  literals.tables.users.current_date = { INTEGER: null }
  literals.tables.users.null = { TEXT: null }
  writeFileSync(schemaPath, JSON.stringify(literals))
  rejects("yield* query('SELECT current_date FROM users')", /requires a quoted identifier/)
  rejects("yield* query('SELECT null FROM users')", /requires a quoted identifier/)
  accepts(
    "const rows = yield* query('SELECT * FROM users'); rows[0].current_date.toFixed(); rows[0].null.toUpperCase()"
  )

  const invalid = JSON.parse(original)
  invalid.tables.users.id = { ANY: null }
  writeFileSync(schemaPath, JSON.stringify(invalid))
  rejects(valid, /not assignable to type 'Snapshot'/, /database\.ts\(\d+,\d+\)/)
  writeFileSync(schemaPath, "{}")
  rejects(valid, /missing the following properties from type 'Snapshot'/, /database\.ts\(\d+,\d+\)/)
  writeFileSync(schemaPath, "{\"version\":")
  rejects(valid, /TS\d+/, /_schema\.json\(\d+,\d+\)/)
  rmSync(schemaPath)
  rejects(valid, /Cannot find module '.\/_schema.json'/, /database\.ts\(\d+,\d+\)/)
  writeFileSync(schemaPath, original)
  accepts(valid)

  const demo = run(["main.ts"])
  assert.equal(demo.status, 0, demo.output)
  assert.deepEqual(JSON.parse(demo.output), {
    sql:
      "SELECT u.id AS userId, u.name, u.email, p.bio AS profileBio FROM users AS u LEFT JOIN profiles AS p ON u.id = p.user_id WHERE u.age >= ? ORDER BY u.name LIMIT ?",
    parameters: [18, 2],
    cards: [
      { id: "1", name: "ADA", email: "(no email)", profile: "Analytical Engine" },
      { id: "2", name: "GRACE", email: "grace@example.com", profile: "(no profile)" }
    ],
    untrustedNameMatches: 0
  })
  console.log(
    "Verified database service requirements, native JSON imports, join nullability, bound parameters, schema invalidation, and SQLite execution."
  )
} finally {
  rmSync(directory, { recursive: true, force: true })
}
