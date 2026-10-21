import type { LifecycleHooks } from "@effect/auth/Hooks"
import { reportAuthDiagnostic } from "@effect/auth/Persistence"
import { type AuthenticationAuthority, SessionUnavailable } from "@effect/auth/Sessions"
import * as Cause from "effect/Cause"
import * as Effect from "effect/Effect"
import * as SqlClient from "effect/sql/SqlClient"

import { PersistenceConfigurationError } from "./configuration.ts"
import type { AuthenticationAuthorityMapping } from "./models/sessionModel.ts"
import { makeNativeSqlTables } from "./nativeSqlTable.ts"
import {
  makeNativeAuthenticationAuthorityServices,
  type NativeAuthenticationAuthorityMapping
} from "./sessionNativeAuthority.ts"
import { SqlBatchCommit } from "./sqlCommit.ts"
import { compileSqlExpression, SqlExpression } from "./sqlExpression.ts"
import type { SqlTableModel } from "./sqlOauthModel.ts"
import { validateSqlStorage } from "./sqlStorageValidation.ts"

/** Direct SQL uses the same authority owner as the mapped Drizzle adapters. */
export const makeAuthenticationAuthorityServices = Effect.fnUntraced(function*<Claims, N>(
  mapping: AuthenticationAuthorityMapping<
    Claims,
    SqlTableModel,
    SqlTableModel,
    SqlTableModel,
    N,
    SqlExpression
  >
): Effect.fn.Return<
  { readonly authenticationAuthority: AuthenticationAuthority["Service"] },
  SessionUnavailable | PersistenceConfigurationError,
  LifecycleHooks | SqlClient.SqlClient
> {
  const sql = yield* SqlClient.SqlClient

  if (!sql.onDialectOrElse({ pg: () => true, sqlite: () => true, orElse: () => false })) {
    yield* reportAuthDiagnostic("persistence-validation", "configuration")

    return yield* PersistenceConfigurationError.make({
      reason: "Authentication authority requires PostgreSQL or SQLite"
    })
  }
  yield* validateSqlStorage(mapping).pipe(
    Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, () => SessionUnavailable.make({}))))
  )

  // Erase mapped native ID callback variance, never decoded authentication data.
  return yield* makeNativeAuthenticationAuthorityServices(makeNativeSqlTables(sql), {
    ...mapping,
    clock: {
      ...mapping.clock,
      toMillis: (value: unknown) =>
        mapping.clock.toMillis(new SqlExpression((client) => compileSqlExpression(client, value))),
      fromMillis: (value: unknown) =>
        mapping.clock.fromMillis(
          new SqlExpression((client) => compileSqlExpression(client, value))
        )
    }
  } as unknown as NativeAuthenticationAuthorityMapping<Claims>).pipe(
    Effect.provideService(SqlBatchCommit, undefined)
  )
})
