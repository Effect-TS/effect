/**
 * @since 1.0.0
 */
import type { SqlError } from "@effect/sql/SqlError"
import type * as Effect from "effect/Effect"
import type { Option } from "effect/Option"
import type { Kysely } from "kysely"
import type { Executable, ExecuteRaw, SqlNoFirstResult } from "./internal/kysely.js"

/**
 * @since 1.0.0
 * @category types
 */
export interface EffectKysely<DB> extends Omit<Kysely<DB>, "transaction" | "executeQuery"> {
  executeRaw: ExecuteRaw<DB>
  execute: <O>(executable: Executable<O>) => Effect.Effect<ReadonlyArray<O>, SqlError, never>
  executeTakeFirstOption: <O>(executable: Executable<O>) => Effect.Effect<Option<O>, SqlError, never>
  executeTakeFirstOrUndefined: <O>(executable: Executable<O>) => Effect.Effect<O | undefined, SqlError, never>
  executeTakeFirstOrError: <O>(executable: Executable<O>) => Effect.Effect<O, SqlError | SqlNoFirstResult, never>
  executeTakeFirstUnsafe: <O>(executable: Executable<O>) => Effect.Effect<O, SqlError, never>
  // withTransaction: <R, E, A>(self: Effect.Effect<A, E, R>) => Effect.Effect<A, E | SqlError, R>
}
