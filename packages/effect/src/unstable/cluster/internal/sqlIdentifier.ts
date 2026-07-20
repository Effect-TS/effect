/**
 * Fits SQL identifiers into PostgreSQL's `NAMEDATALEN - 1` limit (63) without
 * silent truncation collisions. Long names keep a stable hash suffix.
 *
 * @internal
 */
import { hashString } from "./hash.ts"

/** PostgreSQL `NAMEDATALEN - 1` identifier limit (also safe for MySQL). */
/** @internal */
export const SQL_IDENTIFIER_MAX_LENGTH = 63

/**
 * Fits an identifier into {@link SQL_IDENTIFIER_MAX_LENGTH}.
 *
 * @internal
 */
export const sqlIdentifier = (name: string): string => {
  if (name.length <= SQL_IDENTIFIER_MAX_LENGTH) {
    return name
  }
  const digest = (hashString(name) >>> 0).toString(36)
  const keep = SQL_IDENTIFIER_MAX_LENGTH - digest.length - 1
  return `${name.slice(0, keep)}_${digest}`
}

/**
 * Table name from prefix + logical table name.
 *
 * When `limit` is true, long names are capped at {@link SQL_IDENTIFIER_MAX_LENGTH}.
 *
 * @internal
 */
export const storageTableName = (prefix: string, name: string, limit = false): string => {
  const raw = `${prefix}_${name}`
  return limit ? sqlIdentifier(raw) : raw
}

/**
 * Index / constraint name from prefix, logical table name, and suffix.
 *
 * When `limit` is true, long names are capped at {@link SQL_IDENTIFIER_MAX_LENGTH}.
 *
 * @internal
 */
export const storageObjectName = (
  prefix: string,
  tableName: string,
  suffix: string,
  limit = false
): string => {
  const raw = `${prefix}_${tableName}_${suffix}`
  return limit ? sqlIdentifier(raw) : raw
}
