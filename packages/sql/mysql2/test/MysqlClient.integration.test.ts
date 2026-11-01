import { MysqlClient } from "@effect/sql-mysql2"
import { assert, describe, it } from "@effect/vitest"
import { Effect, Fiber, Stream } from "effect"
import * as Arr from "effect/Array"
import * as Scheduler from "effect/Scheduler"
import * as Mysql from "mysql2"
import { EventEmitter } from "node:events"
import { Readable } from "node:stream"
import { vi } from "vitest"

import { MysqlContainer } from "./utils.ts"

vi.mock("mysql2", { spy: true })

describe("MysqlClient", () => {
  it.effect("stream returns same rows as direct execution", () =>
    Effect.gen(function*() {
      const sql = yield* MysqlClient.MysqlClient

      yield* sql`DROP TABLE IF EXISTS stream_regression_test`
      yield* sql`CREATE TABLE stream_regression_test (id INT PRIMARY KEY AUTO_INCREMENT, value VARCHAR(255))`

      const testData = Array.from({ length: 100 }, (_, i) => ({ value: `row_${i}` }))
      assert(Arr.isArrayNonEmpty(testData))
      yield* sql`INSERT INTO stream_regression_test ${sql.insert(testData)}`

      const directResults = yield* sql`SELECT * FROM stream_regression_test`

      const streamResults = yield* Stream.runCollect(
        sql`SELECT * FROM stream_regression_test`.stream
      )

      yield* sql`DROP TABLE stream_regression_test`

      assert.strictEqual(
        streamResults.length,
        directResults.length,
        `Stream returned ${streamResults.length} rows, expected ${directResults.length}`
      )
    }).pipe(
      Effect.provide(MysqlContainer.layerClient),
      Effect.catchTag("ContainerError", () => Effect.void)
    ), { timeout: 60_000 })

  it.effect("uses query when prepared statements are disabled", () =>
    Effect.gen(function*() {
      const calls: Array<"execute" | "query"> = []
      const query = (options: string | object, callback: (cause: null, rows?: Array<unknown>) => void) => {
        if (typeof options !== "string") {
          calls.push("query")
        }
        callback(null, [])
      }
      const conn = {
        threadId: 1,
        query,
        execute: (_options: object, callback: (cause: null, rows: Array<unknown>) => void) => {
          calls.push("execute")
          callback(null, [])
        },
        release: () => {}
      }
      vi.mocked(Mysql.createPool).mockReturnValueOnce({
        query,
        getConnection: (callback: (cause: null, conn: unknown) => void) => callback(null, conn),
        end: (callback: () => void) => callback()
      } as unknown as Mysql.Pool)

      yield* Effect.gen(function*() {
        const sql = yield* MysqlClient.MysqlClient
        yield* sql`SELECT ${1}`
        yield* sql`SELECT ${1}`.values
        yield* sql.unsafe("SELECT ?", [1]).raw
      }).pipe(Effect.provide(MysqlClient.layer({ disablePreparedStatements: true })))

      assert.deepStrictEqual(calls, ["query", "query", "query"])
    }))

  it.live(
    "keeps the connection when a cancelled stream settles before its kill is registered",
    () =>
      Effect.gen(function*() {
        // The yield budget decides where the fiber yields. Small budgets put a
        // yield between deciding to cancel the stream's statement and
        // registering for its settlement, which is where the statement ends.
        for (const maxOpsBeforeYield of [3, 4, 5, 6, 7, 8]) {
          const { destroyed, log } = yield* cancelSettlingStream(maxOpsBeforeYield)
          // A kill that reaches the server while the queued statement runs
          // interrupts that statement instead.
          const kill = log.indexOf("kill 7")
          assert.isTrue(
            kill === -1 || kill < log.indexOf("start SELECT 2 AS value"),
            `budget ${maxOpsBeforeYield}: ${log.join(", ")}`
          )
          assert.isFalse(destroyed, `budget ${maxOpsBeforeYield}: connection destroyed`)
        }
      }),
    { timeout: 60_000 }
  )
})

const cancelSettlingStream = Effect.fnUntraced(function*(maxOpsBeforeYield: number) {
  const log: Array<string> = []
  let destroyed = false
  const command = Object.assign(new EventEmitter(), {
    stream: () => {
      const rows = new Readable({ objectMode: true, read() {} })
      rows.push({ value: 1 })
      rows._destroy = (error, callback) => {
        // The statement ends right after the stream is destroyed, before
        // the fiber resumes.
        queueMicrotask(() => {
          log.push("stream end")
          command.emit("end")
        })
        callback(error)
      }
      return rows
    }
  })
  const conn = {
    threadId: 7,
    query: (options: string | { sql: string }, ...args: Array<any>) => {
      if (typeof options === "string") return command
      args[args.length - 1](null, [])
    },
    execute: (options: { sql: string }, callback: (cause: null, rows: Array<unknown>) => void) => {
      log.push(`start ${options.sql}`)
      setTimeout(() => {
        log.push(`end ${options.sql}`)
        callback(null, [{ value: 2 }])
      }, 50)
    },
    release: () => {},
    destroy: () => {
      destroyed = true
    }
  }
  vi.mocked(Mysql.createPool).mockReturnValueOnce({
    query: (_sql: string, callback: (cause: null) => void) => callback(null),
    getConnection: (callback: (cause: null, conn: unknown) => void) => callback(null, conn),
    end: (callback: () => void) => callback()
  } as unknown as Mysql.Pool)
  vi.mocked(Mysql.createConnection).mockImplementationOnce(() =>
    ({
      on: () => {},
      destroy: () => {},
      query: (_sql: string, values: Array<unknown>, callback: () => void) => {
        // The kill reaches the server once its connection is established.
        setTimeout(() => {
          log.push(`kill ${values[0]}`)
          callback()
        }, 20)
      }
    }) as unknown as Mysql.Connection
  )

  yield* Effect.gen(function*() {
    const sql = yield* MysqlClient.MysqlClient
    yield* sql.withTransaction(Effect.gen(function*() {
      let queued: Fiber.Fiber<unknown, unknown> | undefined
      yield* sql`SELECT 1 AS value`.stream.pipe(
        // Queue a statement on the same connection while the stream runs.
        Stream.tap(() =>
          Effect.map(Effect.forkChild(sql`SELECT 2 AS value`, { startImmediately: true }), (fiber) => {
            queued = fiber
          })
        ),
        Stream.take(1),
        Stream.runCollect,
        Effect.provideService(Scheduler.MaxOpsBeforeYield, maxOpsBeforeYield)
      )
      yield* Fiber.join(queued!)
    }))
  }).pipe(
    Effect.provide(MysqlClient.layer({})),
    Effect.ensuring(Effect.sync(() => vi.mocked(Mysql.createConnection).mockReset()))
  )
  return { destroyed, log }
})
