import { PasskeyConfigurationError } from "@effect/auth/Passkey"
import * as Effect from "effect/Effect"
import * as Predicate from "effect/Predicate"

/**
 * Only foreign constructor types are erased; this creates Drizzle's actual
 * transaction handle while the shared SqlClient owner holds the transaction.
 *
 * @internal
 */
// oxlint-disable-next-line no-explicit-any
// oxlint-disable-next-line no-explicit-any
export type DrizzleTransactionFactory = (database: any) => object

// oxlint-disable-next-line no-explicit-any
/** @internal */
export type DrizzleTransactionConstructor = new(...arguments_: Array<any>) => object

/** @internal */
export const makeDrizzleTransactionHandle = Effect.fnUntraced(function*(
  database: object,
  constructor: DrizzleTransactionConstructor | undefined
): Effect.fn.Return<object, PasskeyConfigurationError> {
  if (
    constructor === undefined ||
    !Predicate.hasProperty(database, "_") ||
    !Predicate.hasProperty(database._, "session") ||
    !Predicate.hasProperty(database._, "relations") ||
    !Predicate.hasProperty(database, "select") ||
    !Predicate.isFunction(database.select)
  ) {
    return yield* PasskeyConfigurationError.make({})
  }
  const selection: unknown = database.select()

  if (!Predicate.hasProperty(selection, "dialect")) {
    return yield* PasskeyConfigurationError.make({})
  }

  return new constructor(
    selection.dialect,
    database._.session,
    database._.relations,
    0,
    Predicate.hasProperty(database, "forbidJsonb")
      ? database.forbidJsonb
      : Predicate.hasProperty(database, "parseRqbJson")
      ? database.parseRqbJson
      : undefined
  )
})
