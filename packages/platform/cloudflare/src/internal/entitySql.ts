/**
 * The entity Durable Object's SQLite exposed to entity handlers as
 * `DurableObjectSqlClient`.
 *
 * A user transaction holds `storage.transaction()` open across Effect
 * suspensions, and every write on the object's single SQLite connection lands
 * inside it. Another handler resumed from inside the transaction could save
 * its reply there and lose it to the user's rollback, so mailbox writes wait
 * on the same gate as user transactions.
 *
 * @internal
 */
import type { DurableObjectStorage } from "@cloudflare/workers-types"
import * as SqliteClient from "@effect/sql-sqlite-do/SqliteClient"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Reactivity from "effect/reactivity/Reactivity"
import type * as Scope from "effect/Scope"
import * as Semaphore from "effect/Semaphore"
import type * as SqlClient from "effect/sql/SqlClient"
import { DurableObjectSqlClient } from "../CloudflareCluster.ts"

/** @internal */
export interface EntitySql {
  /**
   * Builds the client for one handler build. It is closed with the scope of
   * that build; a registration `Reactivity` is reused when present.
   */
  readonly make: (
    context: Context.Context<never>
  ) => Effect.Effect<Context.Context<DurableObjectSqlClient>, never, Scope.Scope>
  /** Runs a mailbox write once no user transaction is open. */
  readonly guard: <A, E, R>(effect: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R>
}

const InUserTransaction = Context.Reference<boolean>(
  "@effect/platform-cloudflare/internal/entitySql/InUserTransaction",
  { defaultValue: () => false }
)

/** @internal */
export const makeEntitySql = (storage: DurableObjectStorage): EntitySql => {
  const gate = Semaphore.makeUnsafe(1)

  const make = Effect.fnUntraced(function*(context: Context.Context<never>) {
    const reactivity = Context.getOption(context, Reactivity.Reactivity)
    const client = yield* SqliteClient.make({ storage }).pipe(
      reactivity._tag === "Some"
        ? Effect.provideService(Reactivity.Reactivity, reactivity.value)
        : Effect.provide(Reactivity.layer)
    )
    // Nested transactions reuse the outer storage transaction, so only the
    // outermost one takes the gate.
    const withTransaction = client.withTransaction
    const gated: SqlClient.SqlClient["withTransaction"] = (effect) =>
      Effect.withFiber((fiber) =>
        fiber.getRef(InUserTransaction)
          ? withTransaction(effect)
          : Semaphore.withPermit(gate, withTransaction(Effect.provideService(effect, InUserTransaction, true)))
      )
    Object.assign(client, { withTransaction: gated })
    return Context.make(DurableObjectSqlClient, client)
  })

  return {
    make,
    guard: (effect) => Semaphore.withPermit(gate, effect)
  }
}
