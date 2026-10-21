import {
  makeNativeSqlTables,
  nativeSqlAlias,
  type NativeSqlTables,
  PersistenceMappingError,
  type SqlTable
} from "@effect/auth-persistence/Adapter"
import {
  type BuildQueryConfig,
  getTableColumns,
  getTableName,
  is,
  Param,
  Placeholder,
  SQL,
  sql,
  type SQLWrapper,
  Table
} from "drizzle-orm"
import { getTableConfig as getMysqlTableConfig, MySqlTable } from "drizzle-orm/mysql-core"
import { getTableConfig as getPgTableConfig, PgTable } from "drizzle-orm/pg-core"
import * as Predicate from "effect/Predicate"
import type { SqlClient } from "effect/sql/SqlClient"
import * as Statement from "effect/sql/Statement"

type CapturedDialect = Pick<BuildQueryConfig, "escapeName" | "escapeString" | "codecs">

/** Foreign compiler boundary only: builders are used to materialize SQL, never
 * executed. The select builder exposes the original dialect even through the
 * Durable Object database projection, which retains bound query methods. */
interface CapturedDatabase {
  readonly select: () => { readonly dialect: CapturedDialect }
  readonly insert: (table: Table) => {
    readonly values: (values: Record<string, unknown>) => SQLWrapper
  }
  readonly update: (table: Table) => {
    readonly set: (values: Record<string, unknown>) => SQLWrapper
  }
}

const invalid = (cause: string): never => {
  // oxlint-disable-next-line effect/no-untyped-throw -- Drizzle SQL compilation and codecs are synchronous; workflow executors capture mapping failures.
  throw PersistenceMappingError.make({ operation: "mapping", cause })
}

const capture = (
  database: object
): { readonly database: CapturedDatabase; readonly dialect: CapturedDialect } => {
  if (
    !Predicate.hasProperty(database, "select") ||
    !Predicate.isFunction(database.select) ||
    !Predicate.hasProperty(database, "insert") ||
    !Predicate.isFunction(database.insert) ||
    !Predicate.hasProperty(database, "update") ||
    !Predicate.isFunction(database.update)
  ) {
    return invalid("Expected a captured Drizzle database")
  }

  const selection: unknown = database.select()

  if (!Predicate.hasProperty(selection, "dialect")) {
    return invalid("Expected a captured Drizzle dialect")
  }
  const dialect = selection.dialect

  if (
    !Predicate.hasProperty(dialect, "escapeName") ||
    !Predicate.isFunction(dialect.escapeName) ||
    !Predicate.hasProperty(dialect, "escapeString") ||
    !Predicate.isFunction(dialect.escapeString)
  ) {
    return invalid("Expected Drizzle dialect escaping methods")
  }

  if (
    Predicate.hasProperty(dialect, "codecs") &&
    dialect.codecs !== undefined &&
    (!Predicate.hasProperty(dialect.codecs, "apply") || !Predicate.isFunction(dialect.codecs.apply))
  ) {
    return invalid("Expected Drizzle dialect codecs")
  }

  // Drizzle's private dialect and generic query builders are erased only here.
  return { database: database as CapturedDatabase, dialect: dialect as CapturedDialect }
}

const compileWith = (dialect: CapturedDialect) => (expression: SQL): Statement.Fragment => {
  const slots: Array<string> = []

  const query = expression.toQuery({
    escapeName: (name) => {
      if (name.includes("\0")) return invalid("NUL in SQL identifier")

      return dialect.escapeName(name)
    },
    escapeString: (value) => {
      if (value.includes("\0")) return invalid("NUL in SQL literal")

      return dialect.escapeString(value)
    },
    escapeParam: (index) => {
      if (index !== slots.length) return invalid("Invalid Drizzle parameter order")
      const slot = `yielded_parameter_${index}`

      slots.push(slot)

      return `\0${slot}\0`
    },
    ...(dialect.codecs === undefined ? {} : { codecs: dialect.codecs })
  })

  // Only compiler-emitted slots are translated. Native Statement parameters
  // receive their final positions when composed; SQL literals containing $1 or
  // ? are never inspected or rewritten. NUL is reserved for this compilation.
  const parts = query.sql.split("\0")

  if (parts.length !== slots.length * 2 + 1 || query.params.length !== slots.length) {
    return invalid("NUL or parameter marker collision in Drizzle SQL")
  }

  const segments: Array<Statement.Segment> = []
  const consumed = new Set<number>()

  for (let offset = 0; offset < parts.length; offset += 2) {
    segments.push(Statement.literal(parts[offset]))
    if (offset + 1 === parts.length) break
    const index = slots.indexOf(parts[offset + 1])

    if (index < 0 || consumed.has(index)) {
      return invalid("NUL or parameter marker collision in Drizzle SQL")
    }
    consumed.add(index)
    const value: unknown = query.params[index]

    if (is(value, Placeholder) || is(value, Param)) return invalid("Unbound Drizzle placeholder")
    if (Statement.isFragment(value)) segments.push(...value.segments)
    else segments.push(Statement.parameter(value))
  }

  return Statement.fragment(segments)
}

/** Preserve native Statement expressions in writes without applying a column
 * codec to them. Ordinary values still pass through Drizzle's own builders. */
const writeValues = (values: Readonly<Record<string, unknown>>) =>
  Object.fromEntries(
    Object.entries(values).map(([key, value]) => [
      key,
      Statement.isFragment(value) ? sql`${sql.param(value)}` : value
    ])
  )

/**
 * Capture the root database's compiler, not a later transaction object's
 * client. Call insert/update inside the operation to materialize hooks once.
 *
 * @internal
 */
export const makeDrizzleSqlTables = (
  client: SqlClient,
  capturedDatabase: object
): NativeSqlTables => {
  const { database, dialect } = capture(capturedDatabase)
  const compile = compileWith(dialect)

  return makeNativeSqlTables(
    client,
    (_client, physical): SqlTable => {
      if (!is(physical, Table)) return invalid("Expected a Drizzle table")
      const columns = getTableColumns(physical)
      const entries = Object.entries(columns)

      const schema = is(physical, PgTable)
        ? getPgTableConfig(physical).schema
        : is(physical, MySqlTable)
        ? getMysqlTableConfig(physical).schema
        : undefined

      const table = { name: getTableName(physical), ...(schema === undefined ? {} : { schema }) }

      const getColumn = (key: string) => {
        const column = Object.hasOwn(columns, key) ? columns[key] : undefined

        if (column === undefined) return invalid("Missing Drizzle column")

        return column
      }

      const ordinals = new Map(entries.map(([key], index) => [key, index]))

      const projection = (keys?: ReadonlyArray<string>) =>
        keys === undefined ? entries : keys.map((key) => [key, getColumn(key)] as const)

      const bind = (alias?: string): SqlTable => {
        const reference = (key: string) => {
          const column = getColumn(key)

          return alias === undefined
            ? sql`${column}`
            : sql`${sql.identifier(alias)}.${sql.identifier(column.name)}`
        }

        const selection = (key: string) => {
          const column = getColumn(key)

          return dialect.codecs === undefined
            ? reference(key)
            : dialect.codecs.apply(column, "cast", reference(key))
        }

        return {
          keys: entries.map(([key]) => key),
          name: compile(
            alias === undefined ? sql`${physical}` : sql`${physical} AS ${sql.identifier(alias)}`
          ),
          as: bind,
          column: (key) => compile(reference(key)),
          columnName: (key) => compile(sql`${sql.identifier(getColumn(key).name)}`),
          selectedColumn: (key) => compile(sql`${selection(key)}`),
          unencodedTextColumn: (key) => {
            const column = getColumn(key)

            return ["PgText", "PgVarchar", "SQLiteText", "MySqlText", "MySqlVarChar"].includes(
                column.columnType
              ) &&
                Predicate.hasProperty(column.mapToDriverValue, "isNoop") &&
                column.mapToDriverValue.isNoop === true &&
                Predicate.hasProperty(column.mapFromDriverValue, "isNoop") &&
                column.mapFromDriverValue.isNoop === true &&
                (dialect.codecs === undefined ||
                  (Predicate.hasProperty(dialect.codecs, "get") &&
                    Predicate.isFunction(dialect.codecs.get) &&
                    (["cast", "normalize", "castParam", "normalizeParam"] as const).every(
                      (kind) => dialect.codecs?.get(column, kind) === undefined
                    )))
              ? { table, name: column.name }
              : undefined
          },
          fields: (prefix, keys) =>
            compile(
              sql.join(
                projection(keys).map(
                  ([key]) => sql`${selection(key)} as ${sql.identifier(nativeSqlAlias(prefix, ordinals.get(key)!))}`
                ),
                sql`, `
              )
            ),
          decode: (row, prefix, keys) =>
            Object.fromEntries(
              projection(keys).map(([key, column]) => {
                const alias = nativeSqlAlias(prefix, ordinals.get(key)!)

                if (!Object.hasOwn(row, alias)) return invalid("Missing SQL projection field")
                const value = row[alias]

                return [
                  key,
                  value === null
                    ? null
                    : column.mapFromDriverValue(
                      dialect.codecs === undefined
                        ? value
                        : dialect.codecs.apply(column, "normalize", value)
                    )
                ]
              })
            ),
          value: (key, value) => {
            const column = getColumn(key)

            return Statement.isFragment(value) ? value : compile(sql`${sql.param(value, column)}`)
          },
          insert: (values) => compile(database.insert(physical).values(writeValues(values)).getSQL()),
          update: (values) => compile(database.update(physical).set(writeValues(values)).getSQL())
        }
      }

      return bind()
    },
    (value) => {
      if (Statement.isFragment(value)) return value
      if (!is(value, SQL)) return invalid("Expected a Drizzle SQL expression")

      return compile(value)
    }
  )
}
