import type { MysqlConnection } from "@effect/sql-mysql"
import { MysqlClient } from "@effect/sql-mysql"
import type { StartedMySqlContainer } from "@testcontainers/mysql"
import { MySqlContainer } from "@testcontainers/mysql"
import { Context, Data, Effect, Layer, Redacted, String } from "effect"

export class ContainerError extends Data.TaggedError("ContainerError")<{
  cause: unknown
}> {}

/**
 * The floor this package supports. `mysql:lts` now resolves to a 9.x release,
 * so the suite pins the 8.x LTS to prove the declared target rather than
 * whatever is newest.
 */
const image = "mysql:8.4"

const makeMysqlContainer = () =>
  new MySqlContainer(image).withHealthCheck({
    test: [
      "CMD-SHELL",
      "MYSQL_PWD=\"$MYSQL_ROOT_PASSWORD\" mysqladmin ping --protocol TCP --host 127.0.0.1 --user root --silent"
    ],
    interval: 250,
    timeout: 1000,
    retries: 1000
  })

export class MysqlContainer extends Context.Service<
  MysqlContainer,
  StartedMySqlContainer
>()("test/MysqlContainer") {
  static readonly layer = Layer.effect(this)(
    Effect.acquireRelease(
      Effect.tryPromise({
        try: () => makeMysqlContainer().start(),
        catch: (cause) => new ContainerError({ cause })
      }),
      (container) => Effect.promise(() => container.stop())
    )
  )

  static client = Layer.unwrap(
    Effect.gen(function*() {
      const container = yield* MysqlContainer
      return MysqlClient.layer({ url: Redacted.make(container.getConnectionUri()) })
    })
  )

  static layerClient = this.client.pipe(Layer.provide(this.layer))

  static clientWithTransforms = Layer.unwrap(
    Effect.gen(function*() {
      const container = yield* MysqlContainer
      return MysqlClient.layer({
        url: Redacted.make(container.getConnectionUri()),
        transformQueryNames: String.camelToSnake,
        transformResultNames: String.snakeToCamel
      })
    })
  )
}

/**
 * The rows of the first statement in a reply.
 *
 * A `Result` says whether it was a result set or counters, so a test that
 * knows it ran a `SELECT` says so here once rather than matching every time.
 */
export const rowsOf = (
  results: ReadonlyArray<MysqlConnection.Result>
): ReadonlyArray<MysqlConnection.Row> => resultSet(results[0]).rows

/** The result set a statement produced, failing the test if it produced counters. */
export const resultSet = (
  result: MysqlConnection.Result | undefined
): Extract<MysqlConnection.Result, { _tag: "ResultSet" }> => {
  if (result === undefined || result._tag !== "ResultSet") {
    throw new Error(`expected a result set, got ${result === undefined ? "nothing" : result._tag}`)
  }
  return result
}

/** The counters a statement produced, failing the test if it produced rows. */
export const okResult = (
  result: MysqlConnection.Result | undefined
): Extract<MysqlConnection.Result, { _tag: "Ok" }> => {
  if (result === undefined || result._tag !== "Ok") {
    throw new Error(`expected counters, got ${result === undefined ? "nothing" : result._tag}`)
  }
  return result
}
