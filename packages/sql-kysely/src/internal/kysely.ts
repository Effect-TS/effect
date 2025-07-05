/**
 * @since 1.0.0
 */
import { SqlError } from "@effect/sql/SqlError"
import * as Effect from "effect/Effect"
import type { Compilable, Kysely, RawBuilder } from "kysely"

import * as Otel from "@opentelemetry/semantic-conventions"
import { Array, Data, Option } from "effect"
import { dual } from "effect/Function"
import type { EffectKysely } from "../patch.types.js"

/**
 * @internal
 * create a Kysely instance from a dialect
 * and using the native kysely driver
 */
export const makeFrom = <DB>(kysely: Kysely<DB>): EffectKysely<DB> => {
  return Object.assign(
    kysely,
    {
      executeRaw: executeRaw<DB>(),
      execute,
      executeTakeFirstOption,
      executeTakeFirstOrUndefined,
      executeTakeFirstOrError,
      executeTakeFirstUnsafe
    }
  )
}

export interface ExecuteRaw<DB> {
  <O>(client: Kysely<DB>, rawBuilder: RawBuilder<O>): Effect.Effect<ReadonlyArray<O>, SqlError, never>
  (client: Kysely<DB>): <O>(rawBuilder: RawBuilder<O>) => Effect.Effect<ReadonlyArray<O>, SqlError, never>
}

const executeRaw: <DB>() => ExecuteRaw<DB> = () =>
  dual(2, (client, rawBuilder) => {
    Effect.tryPromise({
      try: () => rawBuilder.execute(client),
      catch: (cause) => new SqlError({ cause })
    }).pipe(Effect.withSpan("kysely.executeRaw", {
      kind: "client",
      captureStackTrace: false,
      attributes: {
        [Otel.SEMATTRS_DB_STATEMENT]: rawBuilder.compile(client).sql
      }
    }))
  })

export interface Executable<O> extends Compilable<O> {
  execute: () => Promise<void | ReadonlyArray<O>>
}

const execute: <O>(
  executable: Executable<O>
) => Effect.Effect<ReadonlyArray<O>, SqlError, never> = <O>(executable: Executable<O>) =>
  Effect.tryPromise({
    try: () => executable.execute() as Promise<void | ReadonlyArray<O>>,
    catch: (cause) => new SqlError({ cause })
  }).pipe(
    Effect.map((result) => Array.isArray(result) ? result as ReadonlyArray<O> : []),
    Effect.withSpan("kysely.execute", {
      kind: "client",
      captureStackTrace: false,
      attributes: {
        [Otel.SEMATTRS_DB_STATEMENT]: executable.compile().sql
      }
    })
  )

const executeTakeFirstOption: <O>(
  executable: Executable<O>
) => Effect.Effect<Option.Option<O>, SqlError, never> = <O>(
  executable: Executable<O>
) =>
  execute(executable).pipe(
    Effect.map((result) => Array.isNonEmptyReadonlyArray(result) ? Option.some(result[0]) : Option.none())
  )

const executeTakeFirstOrUndefined: <O>(
  executable: Executable<O>
) => Effect.Effect<O | undefined, SqlError, never> = <O>(
  executable: Executable<O>
) =>
  executeTakeFirstOption(executable).pipe(
    Effect.map((result) => Option.getOrUndefined(result))
  )

/**
 * An error that occurs when attempting to access the first returned row of a query result that is empty.
 */
export class SqlNoFirstResult extends Data.TaggedError("SqlNoFirstResult")<{}> {
  toString(): string {
    return `SqlNoFirstResult: query result is empty, no first row available`
  }
}

const executeTakeFirstOrError: <O>(
  executable: Executable<O>
) => Effect.Effect<O, SqlError | SqlNoFirstResult, never> = <
  O
>(
  executable: Executable<O>
) =>
  executeTakeFirstOption(executable).pipe(
    Effect.flatMap((result) => Effect.mapError(result, () => new SqlNoFirstResult()))
  )

const executeTakeFirstUnsafe: <O>(
  executable: Executable<O>
) => Effect.Effect<O, SqlError, never> = <
  O
>(
  executable: Executable<O>
) =>
  execute(executable).pipe(
    Effect.map((result) => Array.unsafeGet(result, 0))
  )
