import type * as Client from "@effect/sql/SqlClient"
import { SqlError } from "@effect/sql/SqlError"
import * as Effect from "effect/Effect"
import * as Effectable from "effect/Effectable"
import type { Compilable, KyselyPlugin, QueryResult } from "kysely"

const ATTR_DB_QUERY_TEXT = "db.query.text"

interface Executable extends Compilable {
  execute: () => Promise<ReadonlyArray<unknown>>
}

const COMMIT_ERROR = "Kysely instance not properly initialised: use 'make' to create an Effect compatible instance"

const PatchProto = {
  ...Effectable.CommitPrototype,
  commit() {
    return Effect.die(new Error(COMMIT_ERROR))
  }
}

/** @internal */
export const patch = (prototype: any) => {
  if (!(Effect.EffectTypeId in prototype)) {
    Object.assign(prototype, PatchProto)
  }
}

function effectifyWith(
  obj: any,
  commit: (plugins: ReadonlyArray<KyselyPlugin>) => Effect.Effect<ReadonlyArray<unknown>, SqlError>,
  whitelist: Array<string>,
  plugins: ReadonlyArray<KyselyPlugin> = []
) {
  if (typeof obj !== "object" || obj === null) {
    return obj
  }
  return new Proxy(obj, {
    get(target, prop, receiver) {
      // Proxy invariants require returning fixed properties unchanged.
      const desc = Object.getOwnPropertyDescriptor(target, prop)
      if (desc && !desc.configurable && !desc.writable) {
        return target[prop]
      }
      const prototype = Object.getPrototypeOf(target)
      if (Effect.EffectTypeId in prototype && prop === "commit") {
        return commit.bind(target, plugins)
      }
      if (typeof (target[prop]) === "function") {
        if (typeof prop === "string" && whitelist.includes(prop)) {
          return target[prop].bind(target)
        }
        return (...args: Array<unknown>) => {
          // Callback helpers need the proxy to retain plugin tracking.
          if (prop === "$call" || (prop === "$if" && args[0])) {
            return target[prop].call(receiver, ...args)
          }
          return effectifyWith(
            target[prop].call(target, ...args),
            commit,
            whitelist,
            prop === "withPlugin" ? [...plugins, args[0] as KyselyPlugin] : prop === "withoutPlugins" ? [] : plugins
          )
        }
      }
      return effectifyWith(target[prop], commit, whitelist, plugins)
    }
  })
}

/** @internal */
const makeSqlCommit = (client: Client.SqlClient) => {
  return function(this: Compilable, plugins: ReadonlyArray<KyselyPlugin>) {
    const { parameters, queryId, sql } = this.compile()
    const execute = client.unsafe<Record<string, unknown>>(sql, parameters)
    if (plugins.length === 0) return execute
    return Effect.flatMap(execute, (rows) =>
      Effect.map(
        Effect.reduce(plugins, { rows: Array.from(rows) } as QueryResult<Record<string, unknown>>, (result, plugin) =>
          Effect.tryPromise({
            try: () =>
              plugin.transformResult({ queryId, result }),
            catch: (cause) =>
              new SqlError({ cause })
          })),
        (result) =>
          result.rows
      ))
  }
}

/** @internal */
function executeCommit(this: Executable) {
  return Effect.tryPromise({
    try: () => this.execute(),
    catch: (cause) => new SqlError({ cause })
  }).pipe(Effect.withSpan("kysely.execute", {
    kind: "client",
    captureStackTrace: false,
    attributes: {
      [ATTR_DB_QUERY_TEXT]: this.compile().sql
    }
  }))
}

/**
 *  @internal
 */
export const effectifyWithSql = <T>(
  obj: T,
  client: Client.SqlClient,
  whitelist: Array<string> = [],
  plugins: ReadonlyArray<KyselyPlugin> = []
): T => effectifyWith(obj, makeSqlCommit(client), whitelist, plugins)

/**
 *  @internal
 */
export const effectifyWithExecute = <T>(obj: T, whitelist: Array<string> = []): T =>
  effectifyWith(obj, executeCommit, whitelist)
