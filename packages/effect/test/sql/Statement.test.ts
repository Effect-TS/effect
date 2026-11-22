import { assert, describe, it } from "@effect/vitest"
import { Effect, Fiber, Option, References, Stream, Tracer } from "effect"
import * as Reactivity from "effect/reactivity/Reactivity"
import * as SqlClient from "effect/sql/SqlClient"
import type { Connection } from "effect/sql/SqlConnection"
import * as Statement from "effect/sql/Statement"
import * as Str from "effect/String"
import * as TestClock from "effect/testing/TestClock"

describe("Statement", () => {
  it("transforms SQL result names without changing nested values", () => {
    const rows: Array<Record<string, unknown>> = [
      { user_id: 1, profile_data: { display_name: "Ada" }, tags: [{ tag_name: "admin" }] }
    ]
    assert.deepStrictEqual(Statement.defaultTransforms(Str.snakeToCamel).array(rows), [
      { userId: 1, profileData: { displayName: "Ada" }, tags: [{ tagName: "admin" }] }
    ])
    assert.deepStrictEqual(Statement.defaultTransforms(Str.snakeToCamel, false).array(rows), [
      { userId: 1, profileData: { display_name: "Ada" }, tags: [{ tag_name: "admin" }] }
    ])
  })

  it("keeps null and scalar items in transformed arrays", () => {
    const rows: Array<Record<string, unknown>> = [{ posts: [null], tags: [{ tag_name: "admin" }, null, 1] }]
    assert.deepStrictEqual(Statement.defaultTransforms(Str.snakeToCamel).array(rows), [
      { posts: [null], tags: [{ tagName: "admin" }, null, 1] }
    ])
    assert.deepStrictEqual(
      Statement.defaultTransforms(Str.snakeToCamel, false).value([{ tag_name: "admin" }, null, 1]),
      [{ tagName: "admin" }, null, 1]
    )
  })

  it("keeps previously distinct SQL column names distinct", () => {
    const rows: Array<Record<string, unknown>> = [
      { _id: 1, id: 2, foo__bar: 3, foo_bar: 4, _: 5, ___: 6 }
    ]
    assert.deepStrictEqual(
      Statement.defaultTransforms(Str.snakeToCamel).array(rows),
      [{ _id: 1, id: 2, foo_bar: 3, fooBar: 4, _: 5, __: 6 }]
    )
    assert.deepStrictEqual(
      Statement.defaultTransforms(Str.snakeToPascal).array(rows),
      [{ _id: 1, Id: 2, Foo_bar: 3, FooBar: 4, _: 5, __: 6 }]
    )
  })

  it("defaultTransforms ignores inherited properties", () => {
    const row = Object.create({ inherited: 1 })
    row.own = 2

    const nested = Statement.defaultTransforms((key) => key.toUpperCase())
    const flat = Statement.defaultTransforms((key) => key.toUpperCase(), false)

    assert.deepStrictEqual(nested.object(row), { OWN: 2 })
    assert.deepStrictEqual(nested.array([row]), [{ OWN: 2 }])
    assert.deepStrictEqual(nested.array([[row]]), [[{ OWN: 2 }]])
    assert.deepStrictEqual(flat.array([row]), [{ OWN: 2 }])
  })

  it("compiles one fragment independently for each compiler", () => {
    const postgres = Statement.makeCompiler({
      dialect: "pg",
      placeholder: (index) => `$${index}`,
      onIdentifier: Statement.defaultEscape("\""),
      onRecordUpdate: () => ["", []],
      onCustom: () => ["", []]
    })
    const sqlite = Statement.makeCompilerSqlite()
    const fragment = Statement.fragment([
      Statement.identifier("value"),
      Statement.parameter(1)
    ])

    assert.deepStrictEqual(postgres.compile(fragment, false), ["\"value\"$1", [1]])
    assert.deepStrictEqual(sqlite.compile(fragment, false), ["\"value\"?", [1]])
  })

  it("escapes updateValues aliases without transforming them", () => {
    const compiler = Statement.makeCompiler({
      dialect: "pg",
      placeholder: (index) => `$${index}`,
      onIdentifier: (value, withoutTransform) => Statement.defaultEscape("\"")(withoutTransform ? value : `t_${value}`),
      onRecordUpdate: (placeholders, alias, columns, values) => [
        `(values ${placeholders}) AS ${alias}${columns}`,
        values.flat()
      ],
      onCustom: () => ["", []]
    })
    const fragment = Statement.fragment([
      Statement.recordUpdateHelper([{ name: "Ada" }], "My\"Data --")
    ])

    assert.deepStrictEqual(compiler.compile(fragment, false), [
      "(values ($1)) AS \"My\"\"Data --\"(\"t_name\")",
      ["Ada"]
    ])
  })

  it("requires a single parameter or single-bind custom segment in record value fragments", () => {
    const sql = Statement.make(
      Effect.never,
      Statement.makeCompiler({
        dialect: "pg",
        placeholder: (index, value) => value === "Int32" ? `{p${index}: Int32}` : `$${index}`,
        onIdentifier: Statement.defaultEscape("\""),
        onRecordUpdate: () => ["", []],
        onCustom: (type, placeholder) => {
          switch (type.kind) {
            case "Typed":
              return [placeholder(type.paramA), [type.paramB]]
            case "Now":
              return ["NOW()", []]
            case "Sum":
              return [`${placeholder(type.paramA)} + ${placeholder(type.paramB)}`, [type.paramA, type.paramB]]
            case "Cast":
              return [`${placeholder(type.paramA)}::text`, [type.paramA]]
            default:
              return ["", []]
          }
        }
      }),
      [],
      undefined
    )
    const typed = Statement.fragment([Statement.custom("Typed")("Int32", 42, undefined)])
    const now = Statement.fragment([Statement.custom("Now")(undefined, undefined, undefined)])
    const sum = Statement.fragment([Statement.custom("Sum")(2, 3, undefined)])
    const cast = Statement.fragment([Statement.custom("Cast")(1, undefined, undefined)])

    assert.throws(() => sql`${sql.update({ visits: sql`visits + ${1}` })}`.compile(), /visits/)
    assert.throws(
      () => sql`${sql.insert({ created_at: sql.literal("CURRENT_TIMESTAMP") })}`.compile(),
      /created_at/
    )
    assert.throws(() => sql`${sql.updateValues([{ visits: sql`${5} + 1` }], "v")}`.compile(), /visits/)
    assert.throws(() => sql`${sql.insert({ name: sql`` })}`.compile(), /name/)
    assert.throws(() => sql`${sql.update({ created_at: now })}`.compile(), /created_at/)
    assert.throws(() => sql`${sql.update({ amount: sum })}`.compile(), /amount/)
    assert.throws(() => sql`${sql.update({ label: cast })}`.compile(), /label/)
    assert.deepStrictEqual(sql`SELECT ${7}, ${typed}, ${9}`.compile(), ["SELECT $1, {p2: Int32}, $3", [7, 42, 9]])
    assert.deepStrictEqual(
      sql`${sql.insert({ a: 7, count: typed, b: 9 })}`.compile(),
      ["(\"a\",\"count\",\"b\") VALUES ($1,{p2: Int32},$3)", [7, 42, 9]]
    )
    assert.deepStrictEqual(
      sql`${sql.update({ visits: sql`${7}`, count: typed, note: undefined })}`.compile(),
      ["\"visits\" = $1, \"count\" = {p2: Int32}, \"note\" = $3", [7, 42, null]]
    )

    const valuesOnly = Statement.make(
      Effect.never,
      Statement.makeCompiler({
        dialect: "pg",
        placeholder: (index) => {
          if (index < 1) {
            throw new RangeError(`invalid bind index ${index}`)
          }
          return `$${index}`
        },
        onIdentifier: Statement.defaultEscape("\""),
        onRecordUpdate: () => ["", []],
        onRecordUpdateSingle: (columns, values) => [columns.join(","), values],
        onCustom: (type, placeholder) =>
          type.kind === "Typed"
            ? [placeholder(type.paramA), [type.paramB]]
            : [`${placeholder(type.paramA)}::text`, [type.paramA]]
      }),
      [],
      undefined
    )
    assert.deepStrictEqual(valuesOnly`${valuesOnly.update({ n: 42, count: typed })}`.compile(), [
      "\"n\",\"count\"",
      [42, 42]
    ])
    assert.throws(() => valuesOnly`${valuesOnly.update({ label: cast })}`.compile(), /label/)
  })

  it("binds plain objects shaped like fragments or segments as parameters", () => {
    const sql = Statement.make({} as any, Statement.makeCompilerSqlite(), [], undefined)
    const fragmentLike = {
      "~effect/sql/Statement/Fragment": "~effect/sql/Statement/Fragment",
      segments: [{ _tag: "Literal", value: "1=1" }]
    }
    const segmentLike = { _tag: "Literal", value: "1=1" }

    assert.deepStrictEqual(sql`SELECT ${fragmentLike}, ${segmentLike}`.compile(), [
      "SELECT ?, ?",
      [fragmentLike, segmentLike]
    ])
  })

  it("uses each constructor's own compiler for a shared acquirer", () => {
    const acquirer = Effect.void as any
    const sql = Statement.make(acquirer, Statement.makeCompilerSqlite(), [], undefined)
    const transformed = Statement.make(acquirer, Statement.makeCompilerSqlite((name) => `t_${name}`), [], undefined)

    assert.deepStrictEqual(sql`SELECT ${sql("a")}`.compile(), ["SELECT \"a\"", []])
    assert.deepStrictEqual(transformed`SELECT ${transformed("a")}`.compile(), ["SELECT \"t_a\"", []])
  })

  it("renumbers a cached returning fragment", () => {
    const sql = Statement.make(
      Effect.void as any,
      Statement.makeCompiler({
        dialect: "pg",
        placeholder: (index) => `$${index}`,
        onIdentifier: Statement.defaultEscape("\""),
        onRecordUpdate: () => ["", []],
        onCustom: () => ["", []]
      }),
      [],
      undefined
    )
    const returning = sql`${"label"} AS label`

    assert.deepStrictEqual(returning.compile(), ["$1 AS label", ["label"]])
    assert.deepStrictEqual(
      sql`INSERT INTO people ${sql.insert({ name: "Ada" }).returning(returning)}, ${"extra"} AS extra`.compile(),
      ["INSERT INTO people (\"name\") VALUES ($1) RETURNING $2 AS label, $3 AS extra", ["Ada", "label", "extra"]]
    )
  })

  it.effect("reads propagation overrides when executing existing statements and streams", () =>
    Effect.gen(function*() {
      let expected = "none"
      const sql = yield* makeClient(Effect.map(Effect.option(Effect.currentSpan), (span) => {
        assert.strictEqual(Option.isSome(span) ? span.value.name : "none", expected)
      }))
      const query = sql`select 1`
      const run = Effect.andThen(query, Stream.runDrain(query.stream))

      yield* run
      expected = "sql.execute"
      yield* Effect.provideService(run, Statement.SpanPropagationEnabled, true)
      expected = "none"
      yield* run.pipe(
        Effect.provideService(Statement.SpanPropagationEnabled, false),
        Effect.provideService(Statement.SpanPropagationEnabled, true)
      )
    }).pipe(Effect.provide(Reactivity.layer)))

  it.effect("parents acquisition, execution, and pulls without adding stack frames", () =>
    Effect.gen(function*() {
      const frame = yield* Effect.service(References.CurrentStackFrame)
      const observe = Effect.gen(function*() {
        assert.strictEqual((yield* Effect.orDie(Effect.currentSpan)).name, "sql.execute")
        assert.strictEqual(yield* Effect.service(References.CurrentStackFrame), frame)
      })
      const acquired = yield* makeClient(observe)
      const borrowed = yield* makeClient(observe, true)

      yield* Effect.gen(function*() {
        yield* acquired`select 1`
        yield* borrowed`select 1`
        yield* Stream.runDrain(borrowed`select 1`.stream)
      }).pipe(Effect.provideService(Statement.SpanPropagationEnabled, true))
    }).pipe(Effect.provide(Reactivity.layer)))

  it.effect("records how long a statement waited for a connection", () =>
    Effect.gen(function*() {
      const spans: Array<Tracer.NativeSpan> = []
      const tracer = Tracer.make({
        span(options) {
          const span = new Tracer.NativeSpan(options)
          spans.push(span)
          return span
        }
      })
      const acquired = yield* makeClient(Effect.void, false, Effect.sleep("30 millis"))
      const borrowed = yield* makeClient(Effect.void, true, Effect.sleep("30 millis"))
      const run = Effect.fnUntraced(function*(statement: Effect.Effect<unknown, unknown>, propagate: boolean) {
        const fiber = yield* Effect.forkChild(
          statement.pipe(
            Effect.withTracer(tracer),
            Effect.provideService(Statement.SpanPropagationEnabled, propagate)
          )
        )
        yield* TestClock.adjust("30 millis")
        yield* Fiber.join(fiber)
      })

      for (const propagate of [true, false]) {
        yield* run(acquired`select 1`, propagate)
        yield* run(borrowed`select 1`, propagate)
        yield* run(Stream.runDrain(acquired`select 1`.stream), propagate)
      }
      assert.deepStrictEqual(
        spans.map((span) => span.attributes.get("db.client.connection.wait_time_ms")),
        [30, 30, 30, undefined, undefined, undefined]
      )
    }).pipe(Effect.provide(Reactivity.layer)))

  it.effect("skips propagation when tracing is disabled", () =>
    Effect.gen(function*() {
      const sql = yield* makeClient(Effect.map(Effect.option(Effect.currentSpan), (span) => {
        assert.isTrue(Option.isNone(span))
      }))
      yield* Effect.andThen(sql`select 1`, Stream.runDrain(sql`select 1`.stream)).pipe(
        Effect.provideService(Statement.SpanPropagationEnabled, true),
        Effect.provideService(References.TracerEnabled, false)
      )
    }).pipe(Effect.provide(Reactivity.layer)))

  it.effect("passes the client that built a statement to the current transformer", () =>
    Effect.gen(function*() {
      const sql = yield* makeClient(Effect.void)
      const copy = sql.withoutTransforms()
      const clients: Array<string> = []
      yield* Effect.all([sql`select 1`, sql.unsafe("select 1"), copy`select 1`, copy.unsafe("select 1")]).pipe(
        Effect.provideService(Statement.CurrentTransformer, (statement, client) => {
          clients.push(client === sql ? "sql" : client === copy ? "copy" : "other")
          return Effect.succeed(statement)
        })
      )
      assert.deepStrictEqual(clients, ["sql", "sql", "copy", "copy"])
    }).pipe(Effect.provide(Reactivity.layer)))
})

const makeClient = (observe: Effect.Effect<void>, borrow = false, acquire = observe) => {
  const execute = Effect.as(observe, [])
  const connection: Connection = {
    execute: () => execute,
    executeRaw: () => execute,
    executeValues: () => execute,
    executeUnprepared: () => execute,
    executeValuesUnprepared: () => execute,
    executeStream: () => Stream.fromEffect(execute)
  }
  return SqlClient.make({
    driver: "test",
    acquirer: Effect.as(acquire, connection),
    borrower: borrow ? (f) => Effect.andThen(acquire, f(connection)) : undefined,
    compiler: Statement.makeCompilerSqlite(),
    spanAttributes: []
  })
}
