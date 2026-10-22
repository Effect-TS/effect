/** @internal */

import type { SqlClient } from "../sql/SqlClient.ts"
import type { Statement } from "../sql/Statement.ts"
import type { NoInfer } from "../Types.ts"
import { assertSnapshot, type DatabaseOf, type Snapshot } from "./sqlQuerySchema.ts"
import type { Arguments, Database, Row, Validate } from "./sqlQueryTypes.ts"

export interface Query<D extends Database> {
  <const Text extends string>(
    text: Text & Validate<D, NoInfer<Text>>,
    ...args: Arguments<D, NoInfer<Text>>
  ): Statement<Row<D, Text>>
}

// Only the literal SQL is passed as SQL text. Every named value is bound as
// a positional parameter, including each occurrence of a repeated name.
export function makeQuery<S extends Snapshot>(client: SqlClient, schema: S): Query<DatabaseOf<S>> {
  assertSnapshot(schema)
  if (!client.onDialectOrElse({ sqlite: () => true, orElse: () => false })) {
    throw new TypeError("SqlClient.makeQuery requires a SQLite client")
  }
  const sql = client.withoutTransforms()
  return ((text: string, params: Readonly<Record<string, unknown>> = {}) => {
    const values: Array<unknown> = []
    const tokens = /\s+|:[A-Za-z_][A-Za-z_0-9]*|[A-Za-z_][A-Za-z_0-9]*|<>|!=|<=|>=|[,.*;=<>]/gy
    let offset = 0
    let compiled = ""
    while (offset < text.length) {
      tokens.lastIndex = offset
      const match = tokens.exec(text)
      if (!match) throw new Error("Unsupported SQL at offset " + offset)
      const token = match[0]
      offset = tokens.lastIndex
      if (token.startsWith(":")) {
        const name = token.slice(1)
        if (!Object.hasOwn(params, name)) throw new Error("Missing SQL parameter :" + name)
        values.push(params[name])
        compiled += "?"
      } else {
        compiled += token
      }
    }
    return sql.unsafe(compiled, values)
  }) as Query<DatabaseOf<S>>
}
