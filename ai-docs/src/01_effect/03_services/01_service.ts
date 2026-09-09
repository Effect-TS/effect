/**
 * @title Context.Service
 *
 * Define services with an interface and a `Context.Service` value of the same
 * name. Include a unique TypeId to distinguish the service structurally.
 */

// file: src/db/Database.ts
import { Context, Effect, Layer, Schema } from "effect"

// The interface names the implementation type and the context requirement.
const DatabaseTypeId = "~myapp/db/Database"

export interface Database {
  readonly [DatabaseTypeId]: typeof DatabaseTypeId

  query(sql: string): Effect.Effect<Array<unknown>, DatabaseError>
}

/**
 * Service key for `Database` implementations.
 *
 * @category services
 * @since 4.0.0
 */
export const Database = (() => {
  const service = Context.Service<Database>("myapp/db/Database")
  return Object.assign(service, {
    // Attach a static layer to the service, which will be used to provide an
    // implementation of the service.
    layer: Layer.effect(
      service,
      Effect.gen(function*() {
        // Define the service methods using Effect.fn
        const query = Effect.fn("Database.query")(function*(sql: string) {
          yield* Effect.log("Executing SQL query:", sql)
          return [{ id: 1, name: "Alice" }, { id: 2, name: "Bob" }]
        })

        // Return an instance of the service using Database.of, passing in an
        // object that implements the service interface.
        return service.of({
          [DatabaseTypeId]: DatabaseTypeId as typeof DatabaseTypeId,
          query
        })
      })
    )
  })
})()

export class DatabaseError extends Schema.TaggedError<DatabaseError>()("DatabaseError", {
  cause: Schema.Defect()
}) {}

// The service interface is directly nameable as Database.
export type DatabaseService = Database
