import type * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import type * as SqlClient from "effect/sql/SqlClient"

/** Standalone operations must observe their own durable commit. */
export const requireStandalone = <Failure>(
  unavailable: () => Failure,
  transactionService?: Context.Key<
    SqlClient.TransactionConnection,
    SqlClient.TransactionConnection.Service
  >
): Effect.Effect<void, Failure> =>
  Effect.withFiber((fiber) => {
    if (transactionService === undefined) return Effect.fail(unavailable())
    const services = fiber.context.mapUnsafe

    if (services.has(transactionService.key)) return Effect.fail(unavailable())

    return Effect.void
  })
