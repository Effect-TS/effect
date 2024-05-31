import type { SqlError } from "@effect/sql/Error"
import type * as Effect from "effect/Effect"
/**
 * QueryPromise class is used for every Drizzle QueryBuilders, it's what allows Builders to be awaitable
 * So since we need all QueryBuilders to also be effactable, we patch it's interface to extend Effect
 * We don't however monkey patch the QueryPromise class itself, but the QueryBuilders that extend it to be able to attach the right client to them
 */
declare module "drizzle-orm" {
  export interface QueryPromise<T> extends Effect.Effect<T, SqlError> {}
}
