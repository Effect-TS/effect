import type * as Client from "@effect/sql/SqlClient"
import { SqlError } from "@effect/sql/SqlError"
import * as Effect from "effect/Effect"
import * as Effectable from "effect/Effectable"
import type { Compilable } from "kysely"

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

/**
 * @internal
 * replace at runtime the commit method on instances that have been patched by the provided one
 * this allows multiple client db instances to have different drivers (@effect/sql or kysely)
 */
function effectifyWith(
  obj: any,
  commit: () => Effect.Effect<ReadonlyArray<unknown>, SqlError>,
  whitelist: Array<string>
) {
  if (typeof obj !== "object" || obj === null) {
    return obj
  }
  return new Proxy(obj, {
    get(target, prop): any {
      const prototype = Object.getPrototypeOf(target)
      if (Effect.EffectTypeId in prototype && prop === "commit") {
        return commit.bind(target)
      }
      if (typeof (target[prop]) === "function") {
        if (typeof prop === "string" && whitelist.includes(prop)) {
          return target[prop].bind(target)
        }
        return (...args: Array<any>) => effectifyWith(target[prop].call(target, ...args), commit, whitelist)
      }
      return effectifyWith(target[prop], commit, whitelist)
    }
  })
}

/** @internal */
const makeSqlCommit = (client: Client.SqlClient) => {
  return function(this: Compilable) {
    const { parameters, sql } = this.compile()
    return client.unsafe(sql, parameters as any)
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
export const effectifyWithSql = <T>(obj: T, client: Client.SqlClient, whitelist: Array<string> = []): T =>
  effectifyWith(obj, makeSqlCommit(client), whitelist)

/**
 *  @internal
 */
export const effectifyWithExecute = <T>(obj: T, whitelist: Array<string> = []): T =>
  effectifyWith(obj, executeCommit, whitelist)
