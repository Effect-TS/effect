import * as Context from "effect/Context"
import * as Layer from "effect/Layer"
import schema from "./_schema.json" with { type: "json" }

export class DatabaseSchema extends Context.Service<DatabaseSchema, typeof schema>()("scratchpad/DatabaseSchema") {
  static readonly layer = Layer.succeed(DatabaseSchema, schema)
}
