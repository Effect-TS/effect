/**
 * @title Composing services with the Layer module
 *
 * Build focused service layers, then compose them with `Layer.provide` and
 * `Layer.provideMerge` based on what services you want to expose.
 */

import { PgClient } from "@effect/sql-pg"
import { Array, Config, Context, Effect, Layer, type Option, Schema } from "effect"
import { SqlClient, SqlError } from "effect/unstable/sql"

// Define a layer for the SqlClient service
export const SqlClientLayer: Layer.Layer<
  PgClient.PgClient | SqlClient.SqlClient,
  Config.ConfigError | SqlError.SqlError
> = PgClient.layerConfig({
  url: Config.Redacted("DATABASE_URL")
})

export class UserRespositoryError extends Schema.TaggedError<UserRespositoryError>()("UserRespositoryError", {
  reason: SqlError.SqlError
}) {}

const UserRepositoryTypeId = "~myapp/UserRepository"

export interface UserRepository {
  readonly [UserRepositoryTypeId]: typeof UserRepositoryTypeId

  findById(id: string): Effect.Effect<
    Option.Option<{ readonly id: string; readonly name: string }>,
    UserRespositoryError
  >
}

/**
 * Service key for `UserRepository` implementations.
 *
 * @category services
 * @since 4.0.0
 */
export const UserRepository = (() => {
  const service = Context.Service<UserRepository>("myapp/UserRepository")
  const service1 = Object.assign(service, {
    // Implement the layer for the UserRepository service, which depends on the
    // SqlClient service
    layerNoDeps: Layer.effect(
      service,
      Effect.gen(function*() {
        const sql = yield* SqlClient.SqlClient

        const findById = Effect.fn("UserRepository.findById")(function*(id: string) {
          const results = yield* sql<{
            readonly id: string
            readonly name: string
          }>`SELECT * FROM users WHERE id = '${id}'`
          return Array.head(results)
        }, Effect.mapError((reason) => new UserRespositoryError({ reason })))

        return service.of({
          [UserRepositoryTypeId]: UserRepositoryTypeId as typeof UserRepositoryTypeId,
          findById
        })
      })
    )
  })
  const service2 = Object.assign(service1, {
    // Use Layer.provide to compose the UserRepository layer with the SqlClient
    // layer, exposing only the UserRepository service1
    layer: service1.layerNoDeps.pipe(
      Layer.provide(SqlClientLayer)
    )
  })
  const service3 = Object.assign(service2, {
    // Use Layer.provideMerge to compose the UserRepository layer with the SqlClient
    // layer, exposing both the UserRepository and SqlClient services
    layerWithSqlClient: service2.layerNoDeps.pipe(
      Layer.provideMerge(SqlClientLayer)
    )
  })
  return service3
})()
