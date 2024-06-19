/**
 * @since 1.0.0
 */
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import type { Dialect } from "kysely"
import { makeFromDialect } from "./internal/kysely.js"

/**
 * @since 1.0.0
 * @category tags
 */
export class KyselyDialect extends Context.Tag("KyselyDialect")<KyselyDialect, Dialect>() {}

/**
 * @since 1.0.0
 * @category constructors
 */
export const make = <DB>() =>
  Effect.gen(function*() {
    const dialect = yield* KyselyDialect
    return makeFromDialect<DB>(dialect)
  })

export * from "./patch.types.js"
