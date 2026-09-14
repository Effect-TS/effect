import { PgConnection, PgTypes } from "@effect/sql-pg"
import { assert, it } from "@effect/vitest"
import { Cause, Deferred, Effect, Exit, Fiber, Queue, Redacted, Scope, Stream } from "effect"
import type { SqlError } from "effect/unstable/sql/SqlError"
import { makeDescriptionGate } from "./descriptionGate.ts"
import { PgContainer } from "./utils.ts"

const makeConnection = (options?: PgConnection.Config) =>
  Effect.gen(function*() {
    const container = yield* PgContainer
    return yield* PgConnection.make({
      url: Redacted.make(container.getConnectionUri()),
      ...options
    })
  })

const assertInterruptedOnClose = (
  scope: Scope.Scope,
  notifications: Queue.Dequeue<PgConnection.Notification, SqlError>
) =>
  Effect.gen(function*() {
    const consumer = yield* Effect.forkScoped(Queue.take(notifications))
    yield* Scope.close(scope, Exit.void)
    const exit = yield* Fiber.await(consumer)
    assert.isTrue(Exit.isFailure(exit) && Cause.hasInterruptsOnly(exit.cause))
  })

it.layer(PgContainer.layer, { timeout: "30 seconds" })("PgConnection", (it) => {
  for (const completion of ["ROLLBACK", "ROLLBACK TO SAVEPOINT caller"]) {
    for (const mode of ["query", "stream"] as const) {
      it.effect(`rediscovers a timestamp restored by transactional DDL ${completion}, ${mode}`, () =>
        Effect.gen(function*() {
          const connection = yield* makeConnection({ prepare: false })
          yield* connection.query("CREATE TEMP TABLE restored_numeric_events (at timestamp)")
          yield* connection.query("SET TIME ZONE 'America/New_York'")
          const sql = "INSERT INTO restored_numeric_events VALUES ($1) RETURNING at"
          const run = () =>
            mode === "stream"
              ? Stream.runCollect(connection.stream(sql, [1714979289123]))
              : Effect.map(connection.query(sql, [1714979289123]), (result) => result.rows)
          yield* connection.query("BEGIN")
          yield* connection.query("SAVEPOINT caller")
          yield* connection.query("ALTER TABLE restored_numeric_events ALTER COLUMN at TYPE bigint USING NULL")
          assert.deepStrictEqual(yield* run(), [{ at: 1714979289123n }])
          yield* connection.query(completion)
          // The temporary bigint resolution must not survive restoration to
          // timestamp. Inside a transaction, a stale numeric OID cannot retry.
          if (completion === "ROLLBACK") yield* connection.query("BEGIN")
          assert.deepStrictEqual(yield* run(), [{ at: 1714979289123 }])
          yield* connection.query("ROLLBACK")
        }))
    }
  }

  for (const columnType of ["timestamp", "timestamptz"]) {
    for (const mode of ["query", "stream"] as const) {
      for (const prepare of [false, true]) {
        for (const warm of [false, true]) {
          it.effect(`retains ${columnType} analysis locks through ${mode} execution, warm=${warm}, prepare=${prepare}`, () =>
            Effect.gen(function*() {
              const container = yield* PgContainer
              const admin = yield* makeConnection()
              const schema = `numeric_race_${columnType}_${mode}_${warm}_${prepare}`
              yield* Effect.acquireRelease(
                admin.query(`CREATE SCHEMA ${schema}`),
                () => Effect.orDie(admin.query(`DROP SCHEMA ${schema} CASCADE`))
              )
              yield* admin.query(`CREATE TABLE ${schema}.events (at ${columnType})`)
              yield* admin.query("SET lock_timeout = '100ms'")
              const sql = `INSERT INTO ${schema}.events VALUES ($1) RETURNING at`
              const gate = makeDescriptionGate(sql, { host: container.getHost(), port: container.getMappedPort(5432) })
              yield* Effect.gen(function*() {
                const connection = yield* makeConnection({ prepare, multiplex: true, stream: gate.stream })
                yield* connection.query("SET TIME ZONE 'America/New_York'")
                const run = () =>
                  mode === "stream"
                    ? Stream.runCollect(connection.stream(sql, [1714979289123]))
                    : Effect.map(connection.query(sql, [1714979289123]), (result) => result.rows)
                if (warm) {
                  gate.release()
                  // The first retry is unnamed; the next call also warms the
                  // named statement when preparation is enabled.
                  for (let round = 0; round < 2; round++) {
                    assert.deepStrictEqual(yield* run(), [{ at: 1714979289123 }])
                  }
                  yield* admin.query(`TRUNCATE ${schema}.events`)
                  gate.arm()
                }
                const query = yield* Effect.forkScoped(run())
                const boundary = yield* Effect.raceFirst(
                  Effect.as(Deferred.await(gate.analyzed), "analyzed"),
                  Effect.as(Fiber.await(query), "completed")
                )
                assert.strictEqual(boundary, "analyzed", "timestamp cache hits must revalidate before execution")
                const nextType = columnType === "timestamp" ? "timestamptz" : "timestamp"
                // Server-side lock_timeout bounds this actual DDL attempt. No
                // elapsed-time threshold is used as evidence of serialization.
                const ddl = yield* Effect.result(admin.query(
                  `ALTER TABLE ${schema}.events ALTER COLUMN at TYPE ${nextType} USING NULL`
                ))
                gate.release()
                const rows = yield* Fiber.join(query)
                assert.deepStrictEqual({ ddl: ddl._tag, rows }, {
                  ddl: "Failure",
                  rows: [{ at: 1714979289123 }]
                })
                if (ddl._tag === "Failure") assert.propertyVal(ddl.failure.reason.cause, "code", "55P03")
                yield* admin.query(`ALTER TABLE ${schema}.events ALTER COLUMN at TYPE ${nextType} USING NULL`)
              }).pipe(Effect.ensuring(Effect.sync(gate.release)))
            }))
        }
      }

      for (const transaction of [false, true]) {
        it.effect(`cleans up retained ${columnType} discovery locks on ${mode} interruption, transaction=${transaction}`, () =>
          Effect.gen(function*() {
            const container = yield* PgContainer
            const admin = yield* makeConnection()
            const schema = `numeric_interrupt_${columnType}_${mode}_${transaction}`
            yield* Effect.acquireRelease(
              admin.query(`CREATE SCHEMA ${schema}`),
              () => Effect.orDie(admin.query(`DROP SCHEMA ${schema} CASCADE`))
            )
            yield* admin.query(`CREATE TABLE ${schema}.events (at ${columnType})`)
            yield* admin.query("SET lock_timeout = '100ms'")
            const sql = `INSERT INTO ${schema}.events VALUES ($1) RETURNING at`
            const gate = makeDescriptionGate(sql, { host: container.getHost(), port: container.getMappedPort(5432) })
            yield* Effect.gen(function*() {
              const connection = yield* makeConnection({ prepare: false, multiplex: true, stream: gate.stream })
              if (transaction) {
                yield* connection.query("CREATE TEMP TABLE interrupted_caller (n int4)")
                yield* connection.query("BEGIN")
                yield* connection.query("INSERT INTO interrupted_caller VALUES (1)")
              }
              const query = yield* Effect.forkScoped(
                mode === "stream"
                  ? Stream.runCollect(connection.stream(sql, [1714979289123]))
                  : connection.query(sql, [1714979289123])
              )
              yield* Deferred.await(gate.analyzed)
              // The initial rejected Parse cycle may already have sent an
              // Execute that PostgreSQL skipped. Count only later messages.
              const executionsBeforeInterruption = gate.executions
              const locks = yield* admin.query(
                "SELECT EXISTS (SELECT 1 FROM pg_locks WHERE pid = $1 AND relation = $2::regclass AND granted) AS held",
                [connection.processId, `${schema}.events`]
              )
              // Record interruption before releasing any held response; a
              // scheduler yield would leave the ordering under test ambiguous.
              query.interruptUnsafe()
              gate.release()
              const exit = yield* Fiber.await(query)
              assert.isTrue(Exit.isFailure(exit) && Cause.hasInterruptsOnly(exit.cause))
              assert.deepStrictEqual((yield* connection.query("SELECT 1 AS n")).rows, [{ n: 1 }])
              const contents = yield* admin.query(`SELECT count(*)::int4 AS n FROM ${schema}.events`)
              const state = yield* admin.query("SELECT state FROM pg_stat_activity WHERE pid = $1", [
                connection.processId
              ])
              assert.deepStrictEqual(state.rows, [{ state: transaction ? "idle in transaction" : "idle" }])
              const nextType = columnType === "timestamp" ? "timestamptz" : "timestamp"
              // Must succeed before the caller commits: discovery's locks
              // should be released by its own interruption cleanup.
              yield* admin.query(`ALTER TABLE ${schema}.events ALTER COLUMN at TYPE ${nextType} USING NULL`)
              if (transaction) {
                assert.deepStrictEqual((yield* connection.query("SELECT n FROM interrupted_caller")).rows, [{ n: 1 }])
                yield* connection.query("COMMIT")
              }
              assert.deepStrictEqual(
                { locks: locks.rows, executions: gate.executions - executionsBeforeInterruption, rows: contents.rows },
                { locks: [{ held: true }], executions: 0, rows: [{ n: 0 }] },
                "interruption must release a retained lock without executing the insert"
              )
            }).pipe(Effect.ensuring(Effect.sync(gate.release)))
          }))
      }
    }
  }

  for (const multiplex of [false, true]) {
    for (const code of ["42804", "42883", "42846", "26000", "0A000"]) {
      it.effect(`executes a failing function only once for ${code}, multiplex=${multiplex}`, () =>
        Effect.gen(function*() {
          const connection = yield* makeConnection({ multiplex })
          yield* connection.query("CREATE TEMP SEQUENCE execution_attempts")
          yield* connection.query(`
            CREATE FUNCTION pg_temp.fail_after_effect(value int4) RETURNS int4 LANGUAGE plpgsql VOLATILE AS $$
            BEGIN
              IF value = 0 THEN RETURN 0; END IF;
              PERFORM nextval('pg_temp.execution_attempts');
              RAISE EXCEPTION 'execution failed after nextval' USING ERRCODE = '${code}';
            END $$
          `)
          const sql = "SELECT pg_temp.fail_after_effect($1) AS n"
          assert.deepStrictEqual((yield* connection.query(sql, [0])).rows, [{ n: 0 }])
          const error = yield* Effect.flip(connection.query(sql, [1]))
          assert.propertyVal(error.reason.cause, "code", code)
          assert.propertyVal(error.reason.cause, "message", "execution failed after nextval")
          // Sequence increments survive a failed statement, unlike table writes.
          // A retry would leave last_value = 2 even if the same error is returned.
          assert.deepStrictEqual(
            (yield* connection.query(
              "SELECT last_value::int4 AS attempts, is_called FROM pg_temp.execution_attempts"
            )).rows,
            [{ attempts: 1, is_called: true }]
          )
        }))
    }
  }

  for (const prepare of [false, true]) {
    for (const columnType of ["timestamp", "timestamptz"]) {
      it.effect(`binds numeric ${columnType} predicates and casts, prepare=${prepare}`, () =>
        Effect.gen(function*() {
          const connection = yield* makeConnection({ prepare })
          yield* connection.query(`CREATE TEMP TABLE numeric_predicates (at ${columnType})`)
          const insert = "INSERT INTO numeric_predicates VALUES ($1) RETURNING at"
          for (const millis of [0, -1234, 1714979289123]) {
            assert.deepStrictEqual((yield* connection.query(insert, [millis])).rows, [{ at: millis }])
            assert.deepStrictEqual(
              (yield* connection.query(
                "SELECT at FROM numeric_predicates WHERE at = $1",
                [millis]
              )).rows,
              [{ at: millis }]
            )
            assert.deepStrictEqual((yield* connection.query(`SELECT $1::${columnType} AS at`, [millis])).rows, [
              { at: millis }
            ])
          }
          // int4 and int8 inputs resolve to the same Parse signature.
          const statements = yield* connection.query(
            "SELECT parameter_types::text AS types FROM pg_prepared_statements WHERE statement = $1",
            [insert],
            false
          )
          assert.deepStrictEqual(
            statements.rows,
            prepare
              ? [{
                types: columnType === "timestamp"
                  ? "{\"timestamp without time zone\"}"
                  : "{\"timestamp with time zone\"}"
              }]
              : []
          )
        }))
    }

    it.effect(`distinguishes numeric UTC fields from Date session-timezone casts, prepare=${prepare}`, () =>
      Effect.gen(function*() {
        const connection = yield* makeConnection({ prepare })
        yield* connection.query("SET TIME ZONE 'America/New_York'")
        yield* connection.query("CREATE TEMP TABLE numeric_timezone (at timestamp, tz timestamptz)")
        for (const [millis, offsetHours] of [[1704524889123, -5], [1714979289123, -4]]) {
          const sql = "INSERT INTO numeric_timezone VALUES ($1, $2) RETURNING *"
          const number = yield* connection.query(sql, [millis, millis])
          const date = yield* connection.query(sql, [new Date(millis), new Date(millis)])
          assert.deepStrictEqual(number.rows, [{ at: millis, tz: millis }])
          assert.deepStrictEqual(date.rows, [{ at: millis + offsetHours * 3600_000, tz: millis }])
        }
      }))
  }

  for (const completion of ["COMMIT", "ROLLBACK"]) {
    it.effect(`invalidates numeric metadata when ${completion} restores SET LOCAL search_path`, () =>
      Effect.gen(function*() {
        const admin = yield* makeConnection()
        const outer = `numeric_outer_${completion.toLowerCase()}`
        const inner = `numeric_inner_${completion.toLowerCase()}`
        for (const schema of [outer, inner]) {
          yield* Effect.acquireRelease(
            admin.query(`CREATE SCHEMA ${schema}`),
            () => Effect.orDie(admin.query(`DROP SCHEMA ${schema} CASCADE`))
          )
        }
        const connection = yield* makeConnection({ prepare: false })
        yield* connection.query(`CREATE TABLE ${outer}.events (at timestamp)`)
        yield* connection.query(`CREATE TABLE ${inner}.events (at timestamptz)`)
        yield* connection.query("SET TIME ZONE 'America/New_York'")
        yield* connection.query(`SET search_path TO ${outer}`)
        const insert = () =>
          Stream.runCollect(connection.stream("INSERT INTO events VALUES ($1) RETURNING at", [1714979289123]))
        assert.deepStrictEqual(yield* insert(), [{ at: 1714979289123 }])
        yield* connection.query("BEGIN")
        yield* connection.query(`SET LOCAL search_path TO ${inner}`)
        assert.deepStrictEqual(yield* insert(), [{ at: 1714979289123 }])
        yield* connection.query(completion)
        // Both assignments are legal. A stale timestamptz OID silently shifts
        // the timestamp by four hours, so error-driven invalidation cannot help.
        assert.deepStrictEqual(yield* insert(), [{ at: 1714979289123 }])
        assert.deepStrictEqual((yield* connection.query(`SELECT at FROM ${outer}.events`)).rows, [
          { at: 1714979289123 },
          { at: 1714979289123 }
        ])
      }))
  }

  for (const columnType of ["timestamp", "timestamptz"]) {
    it.effect(`preserves numeric UTC semantics after an assignment-compatible external change to ${columnType}`, () =>
      Effect.gen(function*() {
        const admin = yield* makeConnection()
        const schema = `numeric_compatible_${columnType}`
        yield* Effect.acquireRelease(
          admin.query(`CREATE SCHEMA ${schema}`),
          () => Effect.orDie(admin.query(`DROP SCHEMA ${schema} CASCADE`))
        )
        const connection = yield* makeConnection({ prepare: false })
        const previousType = columnType === "timestamp" ? "timestamptz" : "timestamp"
        yield* admin.query(`CREATE TABLE ${schema}.events (at ${previousType})`)
        yield* connection.query("SET TIME ZONE 'America/New_York'")
        const insert = () =>
          Stream.runCollect(connection.stream(`INSERT INTO ${schema}.events VALUES ($1) RETURNING at`, [1714979289123]))
        assert.deepStrictEqual(yield* insert(), [{ at: 1714979289123 }])
        yield* admin.query(`TRUNCATE ${schema}.events`)
        yield* admin.query(`ALTER TABLE ${schema}.events ALTER COLUMN at TYPE ${columnType} USING NULL`)
        // PostgreSQL accepts both OIDs. Without fresh destination metadata,
        // the assignment cast shifts the number by the session's UTC offset.
        assert.deepStrictEqual(yield* insert(), [{ at: 1714979289123 }])
      }))

    for (const prepare of [false, true]) {
      for (const mode of ["query", "stream"] as const) {
        it.effect(`invalidates an external ${columnType} change for ${mode}, prepare=${prepare}`, () =>
          Effect.gen(function*() {
            const admin = yield* makeConnection()
            const schema = `numeric_external_${columnType}_${prepare}_${mode}`
            yield* Effect.acquireRelease(
              admin.query(`CREATE SCHEMA ${schema}`),
              () => Effect.orDie(admin.query(`DROP SCHEMA ${schema} CASCADE`))
            )
            const connection = yield* makeConnection({ prepare })
            yield* admin.query(`CREATE TABLE ${schema}.events (at bigint)`)
            const sql = `INSERT INTO ${schema}.events VALUES ($1) RETURNING at`
            const params = [1714979289123]
            // Streams force discovery, giving both modes a populated memo.
            assert.deepStrictEqual(yield* Stream.runCollect(connection.stream(sql, params)), [
              { at: BigInt(1714979289123) }
            ])
            const run = () =>
              mode === "stream"
                ? Stream.runCollect(connection.stream(sql, params))
                : Effect.map(connection.query(sql, params), (result) => result.rows)
            assert.deepStrictEqual(yield* run(), [{ at: BigInt(1714979289123) }])
            yield* admin.query(`TRUNCATE ${schema}.events`)
            yield* admin.query(`ALTER TABLE ${schema}.events ALTER COLUMN at TYPE ${columnType} USING NULL`)

            if (mode === "stream") {
              // Streams surface the first stale-type error; the next call
              // must rediscover. Queries outside a transaction retry once.
              const error = yield* Effect.flip(run())
              assert.propertyVal(error.reason.cause, "code", "42804")
              assert.deepStrictEqual((yield* admin.query(`SELECT count(*)::int4 AS n FROM ${schema}.events`)).rows, [
                { n: 0 }
              ])
            }
            assert.deepStrictEqual(yield* run(), [{ at: 1714979289123 }])
            assert.deepStrictEqual((yield* admin.query(`SELECT count(*)::int4 AS n FROM ${schema}.events`)).rows, [
              { n: 1 }
            ])
          }))
      }
    }

    it.effect(`rediscovers an external ${columnType} change after caller transaction recovery`, () =>
      Effect.gen(function*() {
        const admin = yield* makeConnection()
        const schema = `numeric_external_transaction_${columnType}`
        yield* Effect.acquireRelease(
          admin.query(`CREATE SCHEMA ${schema}`),
          () => Effect.orDie(admin.query(`DROP SCHEMA ${schema} CASCADE`))
        )
        const connection = yield* makeConnection({ prepare: false })
        yield* admin.query(`CREATE TABLE ${schema}.events (at bigint)`)
        const sql = `INSERT INTO ${schema}.events VALUES ($1) RETURNING at`
        yield* Stream.runCollect(connection.stream(sql, [1714979289123]))
        yield* admin.query(`TRUNCATE ${schema}.events`)
        yield* admin.query(`ALTER TABLE ${schema}.events ALTER COLUMN at TYPE ${columnType} USING NULL`)
        yield* connection.query("BEGIN")
        yield* connection.query("SAVEPOINT before_external_change")
        const mismatch = yield* Effect.flip(connection.query(sql, [1714979289123]))
        assert.propertyVal(mismatch.reason.cause, "code", "42804")
        const aborted = yield* Effect.flip(connection.query("SELECT 1"))
        assert.propertyVal(aborted.reason.cause, "code", "25P02")
        yield* connection.query("ROLLBACK TO SAVEPOINT before_external_change")
        assert.deepStrictEqual((yield* connection.query(sql, [1714979289123])).rows, [{ at: 1714979289123 }])
        yield* connection.query("COMMIT")
        assert.deepStrictEqual((yield* admin.query(`SELECT at FROM ${schema}.events`)).rows, [{ at: 1714979289123 }])
      }))

    it.effect(`preserves a transaction through ${columnType} discovery and ambiguous numeric fallback`, () =>
      Effect.gen(function*() {
        const connection = yield* makeConnection()
        yield* connection.query(`CREATE TEMP TABLE numeric_transaction (at ${columnType})`)
        yield* connection.query("BEGIN")
        const inserted = yield* connection.query("INSERT INTO numeric_transaction VALUES ($1) RETURNING at", [
          1714979289123
        ])
        assert.deepStrictEqual(inserted.rows, [{ at: 1714979289123 }])

        // Leaving both operands untyped makes PostgreSQL reject the speculative
        // parse. Its fallback must preserve the insert and the open transaction.
        const sum = yield* connection.query("SELECT $1 + $2 AS total", [1, 2])
        assert.deepStrictEqual(sum.rows, [{ total: 3 }])
        const second = yield* connection.query("INSERT INTO numeric_transaction VALUES ($1) RETURNING at", [-1234])
        assert.deepStrictEqual(second.rows, [{ at: -1234 }])
        yield* connection.query("COMMIT")
        assert.deepStrictEqual((yield* connection.query("SELECT at FROM numeric_transaction ORDER BY at")).rows, [
          { at: -1234 },
          { at: 1714979289123 }
        ])
      }))

    it.effect(`rediscovers an unprepared numeric parameter after its column changes to ${columnType}`, () =>
      Effect.gen(function*() {
        const connection = yield* makeConnection({ prepare: false })
        yield* connection.query("CREATE TEMP TABLE changing_numeric_type (at bigint)")
        const insert = () =>
          connection.query("INSERT INTO changing_numeric_type VALUES ($1) RETURNING at", [1714979289123])
        assert.deepStrictEqual((yield* insert()).rows, [{ at: BigInt(1714979289123) }])
        yield* connection.query("DELETE FROM changing_numeric_type")
        yield* connection.query(`ALTER TABLE changing_numeric_type ALTER COLUMN at TYPE ${columnType} USING NULL`)
        assert.deepStrictEqual((yield* insert()).rows, [{ at: 1714979289123 }])
        const prepared = yield* connection.query("SELECT count(*)::int4 AS count FROM pg_prepared_statements")
        assert.deepStrictEqual(prepared.rows, [{ count: 0 }])
      }))
  }

  it.effect("falls back to ordinary numeric inference for ambiguous unprepared expressions", () =>
    Effect.gen(function*() {
      const connection = yield* makeConnection({ prepare: false })
      for (const [left, right] of [[1, 2], [1.5, 2.25]]) {
        assert.deepStrictEqual((yield* connection.query("SELECT $1 + $2 AS total", [left, right])).rows, [
          { total: left + right }
        ])
      }
    }))

  it.effect("requires a pre-existing savepoint to recover a timestamp type mismatch inside a transaction", () =>
    Effect.gen(function*() {
      const connection = yield* makeConnection()
      yield* connection.query("CREATE TEMP TABLE timestamp_recovery (at timestamp)")
      yield* connection.query("BEGIN")
      yield* connection.query("SAVEPOINT before_mismatch")
      // Explicit int4 bypasses automatic timestamp resolution and proves that
      // retrying 42804 alone cannot recover an already-aborted transaction.
      const mismatch = yield* Effect.flip(
        connection.query("INSERT INTO timestamp_recovery VALUES ($1)", [PgTypes.int4(0)])
      )
      assert.propertyVal(mismatch.reason.cause, "code", "42804")
      const aborted = yield* Effect.flip(connection.query("SELECT 1"))
      assert.propertyVal(aborted.reason.cause, "code", "25P02")
      yield* connection.query("ROLLBACK TO SAVEPOINT before_mismatch")
      const inserted = yield* connection.query("INSERT INTO timestamp_recovery VALUES ($1) RETURNING at", [0])
      assert.deepStrictEqual(inserted.rows, [{ at: 0 }])
      yield* connection.query("COMMIT")
    }))

  it.effect("interrupts notification consumers when the connection scope closes", () =>
    Effect.gen(function*() {
      const scope = yield* Scope.fork(yield* Scope.Scope)
      const connection = yield* Scope.provide(makeConnection(), scope)
      const notifications = yield* connection.listen("closed_listener")
      yield* assertInterruptedOnClose(scope, notifications)
    }))

  it.effect("interrupts notification consumers when the listener scope closes", () =>
    Effect.gen(function*() {
      const scope = yield* Scope.fork(yield* Scope.Scope)
      const connection = yield* makeConnection()
      const notifications = yield* Scope.provide(connection.listen("closed_listener"), scope)
      yield* assertInterruptedOnClose(scope, notifications)
    }))

  it.effect("connects through ReadyForQuery", () =>
    Effect.gen(function*() {
      const connection = yield* makeConnection()
      assert.isAbove(connection.processId, 0)
    }))

  it.effect("runs unnamed extended queries with inferred binary parameters", () =>
    Effect.gen(function*() {
      const connection = yield* makeConnection()
      const instant = new Date("2024-05-06T07:08:09.123Z")
      const result = yield* connection.query(
        "SELECT $1::int4 AS i, $2::float8 AS f, $3::int8 AS b, $4::bool AS flag, " +
          "$5::text AS text, $6::bytea AS bytes, $7::timestamptz AS instant, " +
          "$8::int4[] AS numbers, $9::text AS nil, $10::jsonb AS jsonb",
        [
          1,
          1.5,
          BigInt(2),
          true,
          "hello",
          new Int8Array([1, -1]),
          instant,
          [1, null, 3],
          null,
          PgTypes.jsonb({ nested: true })
        ]
      )
      assert.strictEqual(result.command, "SELECT")
      assert.strictEqual(result.rowCount, 1)
      assert.strictEqual(result.oid, null)
      assert.deepStrictEqual(result.rows, [{
        i: 1,
        f: 1.5,
        b: BigInt(2),
        flag: true,
        text: "hello",
        bytes: new Uint8Array([1, 255]),
        instant: instant.getTime(),
        numbers: [1, null, 3],
        nil: null,
        jsonb: { nested: true }
      }])
      assert.deepStrictEqual(result.fields.map((field) => field.name), [
        "i",
        "f",
        "b",
        "flag",
        "text",
        "bytes",
        "instant",
        "numbers",
        "nil",
        "jsonb"
      ])
    }))

  it.effect("returns queryValues in RowDescription order", () =>
    Effect.gen(function*() {
      const connection = yield* makeConnection()
      const rows = yield* connection.queryValues(
        "SELECT $1::int8 AS second, $2::text AS first",
        [PgTypes.int8(BigInt(7)), "value"]
      )
      assert.deepStrictEqual(rows, [[BigInt(7), "value"]])
    }))

  it.effect("drains query errors and keeps the connection usable", () =>
    Effect.gen(function*() {
      const connection = yield* makeConnection()
      yield* connection.query("CREATE TEMP TABLE pg_connection_unique (value int4 UNIQUE)")
      yield* connection.query("INSERT INTO pg_connection_unique VALUES ($1)", [1])
      const error = yield* Effect.flip(connection.query("INSERT INTO pg_connection_unique VALUES ($1)", [1]))
      assert.strictEqual(error.reason._tag, "UniqueViolation")
      if (error.reason._tag === "UniqueViolation") {
        assert.include(error.reason.constraint, "pg_connection_unique")
      }
      const result = yield* connection.query("SELECT count(*)::int8 AS count FROM pg_connection_unique")
      assert.deepStrictEqual(result.rows, [{ count: BigInt(1) }])
    }))

  it.effect("binds untyped strings and integers beyond int4", () =>
    Effect.gen(function*() {
      const connection = yield* makeConnection()
      yield* connection.query("CREATE TEMP TABLE inference_widening (id bigint, at timestamptz)")
      yield* connection.query(
        "INSERT INTO inference_widening (id, at) VALUES ($1, $2)",
        ["12345678901234", "2024-05-06T07:08:09Z"]
      )
      yield* connection.query("INSERT INTO inference_widening (id) VALUES ($1)", [1755000000000])
      const rows = yield* connection.queryValues("SELECT id FROM inference_widening ORDER BY id")
      assert.deepStrictEqual(rows.map((row) => row[0]), [BigInt(1755000000000), BigInt("12345678901234")])
    }))

  it.effect("reparses a statement whose first execution failed at bind", () =>
    Effect.gen(function*() {
      const connection = yield* makeConnection()
      const missing = yield* Effect.flip(connection.query("select $1::regclass", ["prepared_bind_failure"]))
      assert.strictEqual(missing.reason._tag, "SqlSyntaxError")
      yield* connection.query("CREATE TEMP TABLE prepared_bind_failure (id int)")
      const found = yield* connection.query("select $1::regclass AS rel", ["prepared_bind_failure"])
      assert.strictEqual(found.rows.length, 1)
    }))

  it.effect("fails with AuthenticationError on a bad password", () =>
    Effect.gen(function*() {
      const container = yield* PgContainer
      const error = yield* Effect.flip(PgConnection.make({
        host: container.getHost(),
        port: container.getMappedPort(5432),
        username: container.getUsername(),
        password: Redacted.make("definitely-wrong"),
        database: container.getDatabase()
      }))
      assert.strictEqual(error._tag, "SqlError")
      assert.strictEqual(error.reason._tag, "AuthenticationError")
    }))

  it.effect("fails when the server refuses TLS", () =>
    Effect.gen(function*() {
      const container = yield* PgContainer
      const error = yield* Effect.flip(PgConnection.make({
        host: container.getHost(),
        port: container.getMappedPort(5432),
        username: container.getUsername(),
        password: Redacted.make(container.getPassword()),
        database: container.getDatabase(),
        ssl: true
      }))
      assert.strictEqual(error.reason._tag, "ConnectionError")
      assert.include(error.reason.message, "refused TLS")
    }))
  it.effect("reuses a prepared statement and keeps its columns", () =>
    Effect.gen(function*() {
      const connection = yield* makeConnection()
      for (let index = 0; index < 3; index++) {
        const result = yield* connection.query("SELECT $1::int4 AS value, $2::text AS label", [index, "x"])
        assert.deepStrictEqual(result.rows, [{ value: index, label: "x" }])
        assert.deepStrictEqual(result.fields, [
          { name: "value", dataTypeId: 23 },
          { name: "label", dataTypeId: 25 }
        ])
      }
      const prepared = yield* connection.query("SELECT count(*)::int4 AS n FROM pg_prepared_statements")
      assert.deepStrictEqual(prepared.rows[0], { n: 2 })
    }))

  it.effect("prepares the same text once per parameter signature", () =>
    Effect.gen(function*() {
      const connection = yield* makeConnection()
      assert.deepStrictEqual((yield* connection.query("SELECT $1 AS v", [1])).rows, [{ v: 1 }])
      assert.deepStrictEqual((yield* connection.query("SELECT $1 AS v", [BigInt(2)])).rows, [{ v: BigInt(2) }])
      const types = yield* connection.query(
        "SELECT parameter_types::text AS t FROM pg_prepared_statements WHERE statement = 'SELECT $1 AS v' ORDER BY t"
      )
      assert.deepStrictEqual(types.rows, [{ t: "{bigint}" }, { t: "{integer}" }])
    }))

  it.effect("re-parses a statement whose result type changed", () =>
    Effect.gen(function*() {
      const connection = yield* makeConnection()
      yield* connection.query("CREATE TEMP TABLE shifting (a int)")
      yield* connection.query("INSERT INTO shifting VALUES (1)")
      assert.deepStrictEqual((yield* connection.query("SELECT * FROM shifting")).rows, [{ a: 1 }])
      yield* connection.query("ALTER TABLE shifting ADD COLUMN b text DEFAULT 'added'")
      const after = yield* connection.query("SELECT * FROM shifting")
      assert.deepStrictEqual(after.rows, [{ a: 1, b: "added" }])
      assert.deepStrictEqual(after.fields, [
        { name: "a", dataTypeId: 23 },
        { name: "b", dataTypeId: 25 }
      ])
    }))

  it.effect("re-parses a statement the backend no longer holds", () =>
    Effect.gen(function*() {
      const connection = yield* makeConnection()
      assert.deepStrictEqual((yield* connection.query("SELECT $1::int4 AS n", [7])).rows, [{ n: 7 }])
      yield* connection.query("DEALLOCATE ALL")
      assert.deepStrictEqual((yield* connection.query("SELECT $1::int4 AS n", [8])).rows, [{ n: 8 }])
    }))

  it.effect("closes statements it evicts from a full cache", () =>
    Effect.gen(function*() {
      const connection = yield* makeConnection({ preparedStatementCacheSize: 3 })
      for (let round = 0; round < 2; round++) {
        for (let index = 0; index < 8; index++) {
          const result = yield* connection.query(`SELECT ${index}::int4 AS n, $1::text AS t`, ["v"])
          assert.deepStrictEqual(result.rows, [{ n: index, t: "v" }])
        }
      }
      const held = yield* connection.query("SELECT count(*)::int4 AS n FROM pg_prepared_statements")
      assert.deepStrictEqual(held.rows[0], { n: 3 })
    }))

  it.effect("closes statements parsed while a pipeline overfills the cache", () =>
    Effect.gen(function*() {
      const connection = yield* makeConnection({ preparedStatementCacheSize: 1, multiplex: true })
      yield* Effect.all(
        Array.from({ length: 4 }, (_, index) => connection.query(`SELECT ${index}::int4 AS n`)),
        { concurrency: "unbounded" }
      )
      const held = yield* connection.query("SELECT count(*)::int4 AS n FROM pg_prepared_statements")
      assert.deepStrictEqual(held.rows[0], { n: 1 })
    }))

  it.effect("parses every statement when prepare is off", () =>
    Effect.gen(function*() {
      const connection = yield* makeConnection({ prepare: false })
      for (let index = 0; index < 3; index++) {
        assert.deepStrictEqual((yield* connection.query("SELECT $1::int4 AS n", [index])).rows, [{ n: index }])
      }
      const held = yield* connection.query("SELECT count(*)::int4 AS n FROM pg_prepared_statements")
      assert.deepStrictEqual(held.rows[0], { n: 0 })
    }))

  it.effect("stays usable after a statement the server refuses to parse", () =>
    Effect.gen(function*() {
      const connection = yield* makeConnection()
      const missing = yield* Effect.flip(connection.query("SELECT * FROM does_not_exist"))
      assert.strictEqual(missing.reason._tag, "SqlSyntaxError")
      const syntax = yield* Effect.flip(connection.query("SELECT FROM WHERE ????"))
      assert.strictEqual(syntax.reason._tag, "SqlSyntaxError")
      assert.deepStrictEqual((yield* connection.query("SELECT 42::int4 AS answer")).rows, [{ answer: 42 }])
    }))
  it.effect("closes a statement whose plan it had to throw away", () =>
    Effect.gen(function*() {
      const connection = yield* makeConnection()
      yield* connection.query("CREATE TEMP TABLE churn (a int)")
      for (let round = 0; round < 4; round++) {
        yield* connection.query("SELECT * FROM churn")
        yield* connection.query(`ALTER TABLE churn ADD COLUMN c${round} text`)
      }
      yield* connection.query("SELECT * FROM churn")
      // Every re-parse after a stale plan has to close the name it replaced,
      // or each DDL change strands a statement on the backend.
      const held = yield* connection.query(
        "SELECT count(*)::int4 AS n FROM pg_prepared_statements WHERE statement = 'SELECT * FROM churn'"
      )
      assert.deepStrictEqual(held.rows[0], { n: 1 })
    }))
  it.effect("re-parses a statement first prepared in a rolled back transaction", () =>
    Effect.gen(function*() {
      const connection = yield* makeConnection()
      yield* connection.query("CREATE TEMP TABLE rolled_back (a int)")

      // Postgres drops a statement prepared inside a transaction it rolls
      // back, so the cached name is gone even though the session lives on.
      yield* connection.query("BEGIN")
      yield* connection.query("INSERT INTO rolled_back VALUES ($1::int4)", [1])
      yield* connection.query("ROLLBACK")

      yield* connection.query("INSERT INTO rolled_back VALUES ($1::int4)", [2])
      yield* connection.query("INSERT INTO rolled_back VALUES ($1::int4)", [3])
      assert.deepStrictEqual(
        (yield* connection.query("SELECT a FROM rolled_back ORDER BY a")).rows,
        [{ a: 2 }, { a: 3 }]
      )
    }))
  it.effect("isolates errors between pipelined queries", () =>
    Effect.gen(function*() {
      const connection = yield* makeConnection({ multiplex: true })
      const exits = yield* Effect.all([
        Effect.exit(connection.query("SELECT $1::int4 AS first", [1])),
        Effect.exit(connection.query("SELECT missing_pipeline_column")),
        Effect.exit(connection.query("SELECT $1::int4 AS third", [3]))
      ], { concurrency: "unbounded" })

      assert.strictEqual(exits[0]._tag, "Success")
      assert.strictEqual(exits[1]._tag, "Failure")
      assert.strictEqual(exits[2]._tag, "Success")
      if (exits[0]._tag === "Success") assert.deepStrictEqual(exits[0].value.rows, [{ first: 1 }])
      if (exits[2]._tag === "Success") assert.deepStrictEqual(exits[2].value.rows, [{ third: 3 }])
    }))

  it.effect("drains an interrupted pipelined query without cancelling its neighbors", () =>
    Effect.gen(function*() {
      const connection = yield* makeConnection({ multiplex: true })
      const first = yield* connection.query("SELECT pg_sleep(0.05), 1 AS first").pipe(Effect.forkScoped)
      const second = yield* connection.query("SELECT 2 AS second").pipe(Effect.forkScoped)
      yield* Effect.yieldNow
      yield* Fiber.interrupt(first)

      const result = yield* Fiber.join(second)
      assert.deepStrictEqual(result.rows, [{ second: 2 }])
      assert.deepStrictEqual((yield* connection.query("SELECT 3 AS after")).rows, [{ after: 3 }])
    }))

  it.effect("places pin requests between earlier and later pipelined queries", () =>
    Effect.gen(function*() {
      const connection = yield* makeConnection({ multiplex: true })
      yield* connection.query(
        "CREATE TEMP TABLE pipeline_pin_order (position int GENERATED ALWAYS AS IDENTITY, value int4)"
      )
      const first = yield* connection.query(
        "INSERT INTO pipeline_pin_order (value) SELECT 1 FROM pg_sleep(0.05)"
      ).pipe(Effect.forkScoped)
      yield* Effect.yieldNow

      const pinned = yield* Deferred.make<void>()
      const release = yield* Deferred.make<void>()
      const pinFiber = yield* Effect.scoped(Effect.gen(function*() {
        const exclusive = yield* connection.pin
        yield* exclusive.query("INSERT INTO pipeline_pin_order (value) VALUES (2)")
        yield* Deferred.succeed(pinned, undefined)
        yield* Deferred.await(release)
      })).pipe(Effect.forkScoped)
      yield* Effect.yieldNow
      const third = yield* connection.query("INSERT INTO pipeline_pin_order (value) VALUES (3)").pipe(
        Effect.forkScoped
      )

      yield* Deferred.await(pinned)
      assert.isUndefined(third.pollUnsafe())
      yield* Deferred.succeed(release, undefined)
      yield* Fiber.join(first)
      yield* Fiber.join(pinFiber)
      yield* Fiber.join(third)

      const result = yield* connection.query("SELECT value FROM pipeline_pin_order ORDER BY position")
      assert.deepStrictEqual(result.rows, [{ value: 1 }, { value: 2 }, { value: 3 }])
    }))

  it.effect("reuses prepared statements across a pipeline", () =>
    Effect.gen(function*() {
      const connection = yield* makeConnection({ multiplex: true })
      for (let round = 0; round < 3; round++) {
        const results = yield* Effect.all(
          Array.from({ length: 8 }, (_, index) => connection.query("SELECT $1::int4 AS n", [index])),
          { concurrency: "unbounded" }
        )
        results.forEach((result, index) => assert.deepStrictEqual(result.rows, [{ n: index }]))
      }
      const held = yield* connection.query(
        "SELECT count(*)::int4 AS n FROM pg_prepared_statements WHERE statement = 'SELECT $1::int4 AS n'"
      )
      assert.deepStrictEqual(held.rows[0], { n: 1 })
    }))
  it.effect("orders ordinary statements against a stream on the same session", () =>
    Effect.gen(function*() {
      const connection = yield* makeConnection()
      // An ordinary statement holds `owner` rather than the wire permit, so
      // this is what says it still cannot interleave with a stream, which
      // reaches the session through a pin.
      const streamed = yield* Effect.forkScoped(
        Stream.runCollect(connection.stream("SELECT generate_series(1, 200) AS n"))
      )
      const queried = yield* Effect.forkScoped(
        Effect.all(
          Array.from({ length: 12 }, (_, index) => connection.query("SELECT $1::int4 AS n", [index])),
          { concurrency: "unbounded" }
        )
      )
      const rows = yield* Fiber.join(streamed)
      assert.strictEqual(Array.from(rows).length, 200)
      const results = yield* Fiber.join(queried)
      results.forEach((result, index) => assert.deepStrictEqual(result.rows, [{ n: index }]))
      assert.deepStrictEqual((yield* connection.query("SELECT 1 AS ok")).rows, [{ ok: 1 }])
    }))
})
