import * as SqlClient from "effect/sql/SqlClient"
import schema from "./_schema.json" with { type: "json" }

export class Database extends SqlClient.Service<Database>()("scratchpad/Database", { schema }) {}
