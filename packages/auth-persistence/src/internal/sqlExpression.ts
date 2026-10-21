import * as Predicate from "effect/Predicate"
import type { SqlClient } from "effect/sql/SqlClient"
import * as Statement from "effect/sql/Statement"

import { PersistenceMappingError } from "./mappingError.ts"
import { Column, identifier, Table } from "./sqlTable.ts"

/** Pure mapped SQL. Compilation binds values through the executing client's
 * dialect; expressions neither acquire a client nor execute a query. */
export class SqlExpression {
  readonly compile: (client: SqlClient) => Statement.Fragment

  constructor(compile: (client: SqlClient) => Statement.Fragment) {
    this.compile = compile
  }
}

const quoted = (client: SqlClient, name: string) => {
  if (name.includes("\0")) {
    // oxlint-disable-next-line effect/no-untyped-throw -- SQL expression compilation must synchronously return a Fragment; workflow adapters capture mapping failures.
    throw PersistenceMappingError.make({ operation: "mapping", cause: "NUL in SQL identifier" })
  }

  return client.literal(identifier(name))
}

const tableName = (client: SqlClient, name: string, schema?: string) =>
  schema === undefined
    ? quoted(client, name)
    : client`${quoted(client, schema)}.${quoted(client, name)}`

const value = (client: SqlClient, input: unknown): Statement.Fragment => {
  if (Statement.isFragment(input)) return input
  if (input instanceof SqlExpression) return input.compile(client)
  if (input instanceof Table) return tableName(client, input.name, input.schema)
  if (input instanceof Column) {
    return client`${tableName(client, input.tableName, input.schema)}.${quoted(client, input.options.name)}`
  }

  return Statement.fragment([
    Statement.parameter(
      Predicate.isBoolean(input)
        ? client.onDialectOrElse({ sqlite: () => Number(input), orElse: () => input })
        : input
    )
  ])
}

/**
 * Reject foreign expression handles at the metadata boundary.
 *
 * @internal
 */
export const compileSqlExpression = (
  client: SqlClient,
  expression: unknown
): Statement.Fragment => {
  if (
    !Statement.isFragment(expression) &&
    !(expression instanceof SqlExpression) &&
    !(expression instanceof Table) &&
    !(expression instanceof Column)
  ) {
    // oxlint-disable-next-line effect/no-untyped-throw -- SQL expression compilation must synchronously return a Fragment; workflow adapters capture mapping failures.
    throw PersistenceMappingError.make({
      operation: "mapping",
      cause: "Expected a SQL expression"
    })
  }

  return value(client, expression)
}

const template = (parts: TemplateStringsArray, ...values: ReadonlyArray<unknown>) =>
  new SqlExpression((client) =>
    client.join(
      "",
      false
    )(
      parts.flatMap((part, index) =>
        index === 0
          ? [client.literal(part)]
          : [value(client, values[index - 1]), client.literal(part)]
      )
    )
  )

export const sql = Object.assign(template, {
  join: (values: ReadonlyArray<unknown>, separator: SqlExpression = template``) =>
    new SqlExpression((client) =>
      client.join(
        "",
        false
      )(
        values.flatMap((input, index) =>
          index === 0 ? [value(client, input)] : [separator.compile(client), value(client, input)]
        )
      )
    )
})

export const eq = (left: unknown, right: unknown): SqlExpression => sql`${left} = ${right}`

export const and = (...expressions: ReadonlyArray<SqlExpression | undefined>) => {
  const present = expressions.filter((expression) => expression !== undefined)

  return present.length === 0 ? undefined : sql`(${sql.join(present, sql` AND `)})`
}
