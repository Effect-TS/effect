import { assert, describe, it } from "@effect/vitest"
import { Deferred, Effect, Fiber, Option, References, Stream, Tracer } from "effect"
import * as Reactivity from "effect/unstable/reactivity/Reactivity"
import * as SqlClient from "effect/unstable/sql/SqlClient"
import type { Connection } from "effect/unstable/sql/SqlConnection"
import * as Statement from "effect/unstable/sql/Statement"

describe("Statement", () => {
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

  for (const borrower of [false, true]) {
    for (const propagateSpan of [undefined, false, true]) {
      for (const tracing of [false, true]) {
        it.effect(`propagation ${propagateSpan}, tracing ${tracing}, borrower ${borrower}`, () =>
          Effect.gen(function*() {
            const outer = yield* Effect.makeSpan("outer")
            const expected = propagateSpan && tracing ? "sql.execute" : "outer"
            const seen: Array<string> = []
            let leased = false
            const frame = yield* Effect.service(References.CurrentStackFrame)
            const observe = (event: string) =>
              Effect.gen(function*() {
                const span = yield* Effect.orDie(Effect.currentSpan)
                assert.strictEqual(span.name, expected, event)
                assert.strictEqual(span.status._tag, "Started", event)
                assert.strictEqual(yield* Effect.service(References.CurrentStackFrame), frame)
                if (tracing) {
                  const child = yield* Effect.makeSpan("driver")
                  assert.strictEqual(Option.getOrUndefined(child.parent), span)
                }
                seen.push(event)
                return []
              })
            const connection: Connection = {
              execute: () => observe("execute"),
              executeRaw: () => observe("raw"),
              executeValues: () => observe("values"),
              executeUnprepared: () => observe("unprepared"),
              executeValuesUnprepared: () => observe("valuesUnprepared"),
              executeStream: () =>
                Stream.fromEffect(Effect.gen(function*() {
                  assert.isTrue(leased)
                  return yield* observe("pull")
                }))
            }
            const acquirer = Effect.acquireRelease(
              Effect.as(
                Effect.tap(observe("acquire"), () =>
                  Effect.sync(() => {
                    leased = true
                  })),
                connection
              ),
              () =>
                Effect.sync(() => {
                  leased = false
                })
            )
            const sql = yield* SqlClient.make({
              acquirer,
              borrower: borrower ? (f) => Effect.flatMap(observe("borrow"), () => f(connection)) : undefined,
              compiler: Statement.makeCompilerSqlite(),
              spanAttributes: [],
              transformRows: (rows) => rows
            })
            const query = sql`select 1`
            const stream = query.stream
            const program = Effect.gen(function*() {
              yield* query
              yield* sql`select 1`.values
              yield* sql`select 1`.raw
              yield* sql`select 1`.unprepared
              yield* sql`select 1`.valuesUnprepared
              yield* sql`select 1`.withoutTransform
              yield* sql.unsafe("select 1")
              yield* sql.withoutTransforms()`select 1`
              yield* Stream.runDrain(stream)
              assert.isFalse(leased)
              assert.strictEqual(yield* Effect.orDie(Effect.currentSpan), outer)
            }).pipe(
              Effect.provideService(Tracer.ParentSpan, outer),
              Effect.provideService(References.TracerEnabled, tracing)
            )
            yield* propagateSpan === undefined
              ? program
              : Effect.provideService(program, Statement.SpanPropagationEnabled, propagateSpan)
            const lease = borrower ? "borrow" : "acquire"
            assert.deepStrictEqual(seen, [
              lease,
              "execute",
              lease,
              "values",
              lease,
              "raw",
              lease,
              "unprepared",
              lease,
              "valuesUnprepared",
              lease,
              "execute",
              lease,
              "execute",
              lease,
              "execute",
              "acquire",
              "pull"
            ])
          }).pipe(Effect.provide(Reactivity.layer)))
      }
    }
  }

  it.effect("reads scoped flags when reusing clients, statements, and streams", () =>
    Effect.gen(function*() {
      const seen: Array<string> = []
      const observe = Effect.map(Effect.option(Effect.currentSpan), (span) => {
        seen.push(Option.isSome(span) ? span.value.name : "none")
        return []
      })
      const connection: Connection = {
        execute: () => observe,
        executeRaw: () => observe,
        executeStream: () => Stream.fromEffect(observe),
        executeValues: () => observe,
        executeUnprepared: () => observe,
        executeValuesUnprepared: () => observe
      }
      const sql = yield* SqlClient.make({
        acquirer: Effect.succeed(connection),
        compiler: Statement.makeCompilerSqlite(),
        spanAttributes: []
      }).pipe(Effect.provideService(Statement.SpanPropagationEnabled, true))
      const query = sql`select 1`
      const stream = query.stream
      const run = Effect.andThen(query, Stream.runDrain(stream))
      yield* run
      yield* Effect.gen(function*() {
        yield* run
        yield* Effect.provideService(run, Statement.SpanPropagationEnabled, false)
        assert.isTrue(yield* Effect.service(Statement.SpanPropagationEnabled))
        yield* run
      }).pipe(Effect.provideService(Statement.SpanPropagationEnabled, true))
      assert.isFalse(yield* Effect.service(Statement.SpanPropagationEnabled))
      yield* run
      yield* query.pipe(
        Effect.provideService(
          Statement.CurrentTransformer,
          (statement, sql) =>
            Effect.as(
              Effect.orDie(Effect.provideService(sql`select 2`, Statement.CurrentTransformer, undefined)),
              statement
            )
        ),
        Effect.provideService(Statement.SpanPropagationEnabled, true)
      )
      assert.deepStrictEqual(seen, [
        "none",
        "none",
        "sql.execute",
        "sql.execute",
        "none",
        "none",
        "sql.execute",
        "sql.execute",
        "none",
        "none",
        "sql.execute",
        "sql.execute"
      ])
    }).pipe(Effect.provide(Reactivity.layer)))

  for (const stream of [false, true]) {
    it.effect(`isolates concurrent ${stream ? "stream" : "execute"} propagation overrides`, () =>
      Effect.gen(function*() {
        const ready = yield* Deferred.make<void>()
        const resume = yield* Deferred.make<void>()
        const seen: Array<readonly [boolean, string]> = []
        const observe = Effect.gen(function*() {
          const enabled = yield* Effect.service(Statement.SpanPropagationEnabled)
          if (enabled) {
            yield* Deferred.succeed(ready, undefined)
            yield* Deferred.await(resume)
          }
          const span = yield* Effect.option(Effect.currentSpan)
          seen.push([enabled, Option.isSome(span) ? span.value.name : "none"])
          return []
        })
        const connection: Connection = {
          execute: () => observe,
          executeRaw: () => observe,
          executeValues: () => observe,
          executeUnprepared: () => observe,
          executeValuesUnprepared: () => observe,
          executeStream: () => Stream.fromEffect(observe)
        }
        const sql = yield* SqlClient.make({
          acquirer: Effect.succeed(connection),
          borrower: (f) => f(connection),
          compiler: Statement.makeCompilerSqlite(),
          spanAttributes: []
        })
        const query = sql`select 1`
        const run = stream ? Stream.runDrain(query.stream) : query
        const fiber = yield* Effect.forkChild(Effect.provideService(run, Statement.SpanPropagationEnabled, true))
        yield* Deferred.await(ready)
        yield* Effect.provideService(run, Statement.SpanPropagationEnabled, false)
        yield* Deferred.succeed(resume, undefined)
        yield* Fiber.join(fiber)
        assert.isFalse(yield* Effect.service(Statement.SpanPropagationEnabled))
        assert.deepStrictEqual(seen, [[false, "none"], [true, "sql.execute"]])
      }).pipe(Effect.provide(Reactivity.layer)))
  }

  for (const stream of [false, true]) {
    it.effect(`restores the parent and releases the connection on ${stream ? "stream" : "execute"} failure`, () =>
      Effect.gen(function*() {
        const outer = yield* Effect.makeSpan("outer")
        let released = false
        let executionSpan: Tracer.Span | undefined
        const fail = Effect.flatMap(Effect.orDie(Effect.currentSpan), (span) => {
          executionSpan = span
          return Effect.die("driver failed")
        })
        const connection: Connection = {
          execute: () => fail,
          executeRaw: () => fail,
          executeValues: () => fail,
          executeUnprepared: () => fail,
          executeValuesUnprepared: () => fail,
          executeStream: () => Stream.fromEffect(fail)
        }
        const sql = yield* SqlClient.make({
          acquirer: Effect.acquireRelease(Effect.succeed(connection), () =>
            Effect.sync(() => {
              released = true
            })),
          compiler: Statement.makeCompilerSqlite(),
          spanAttributes: []
        })
        yield* Effect.gen(function*() {
          const run = stream ? Stream.runDrain(sql`select 1`.stream) : sql`select 1`
          const exit = yield* Effect.exit(Effect.provideService(run, Statement.SpanPropagationEnabled, true))
          assert.strictEqual(exit._tag, "Failure")
          assert.isFalse(yield* Effect.service(Statement.SpanPropagationEnabled))
          assert.strictEqual(yield* Effect.orDie(Effect.currentSpan), outer)
        }).pipe(Effect.provideService(Tracer.ParentSpan, outer))
        assert.isTrue(released)
        assert.strictEqual(executionSpan?.name, "sql.execute")
        assert.strictEqual(executionSpan?.status._tag, "Ended")
      }).pipe(Effect.provide(Reactivity.layer)))
  }
})
