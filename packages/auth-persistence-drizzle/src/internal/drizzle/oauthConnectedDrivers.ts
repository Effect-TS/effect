import type { LifecycleHooks } from "@effect/auth/Hooks"
import { OAuthConnectedPersistence, OAuthConnectedRevocations } from "@effect/auth/OAuth"
import type { Table } from "drizzle-orm"
import * as Context from "effect/Context"
import type * as Digest from "effect/crypto/Digest"
import type * as SecureRandom from "effect/crypto/SecureRandom"
import * as Effect from "effect/Effect"

import type { D1BatchStatements } from "./d1BatchStatements.ts"
import { NativeDatabase, nativeDatabase } from "./nativeDatabase.ts"
import type { OAuthConnectedMapping, OAuthConnectedRevocationMapping } from "./oauthConnectedModel.ts"
import {
  coordinateTargetOAuthConnected,
  coordinateTargetOAuthConnectedRevocations,
  makeTargetOAuthConnectedRevocationServices,
  makeTargetOAuthConnectedServices,
  type OAuthCoordinatorError,
  type OAuthTargetConfiguration
} from "./oauthTarget.ts"
import type { SuppliedService } from "./suppliedService.ts"
// oxlint-disable-next-line no-explicit-any -- inspect the actual installed native transaction callback without erasing it.
type TransactionOf<D> = D extends { readonly transaction: (...args: Array<any>) => any }
  ? Parameters<Parameters<D["transaction"]>[0]>[0]
  : never

/** @internal */
export const makeOAuthConnectedTarget = <
  DatabaseId,
  Database,
  Family extends Table,
  Extra = {},
  Provided extends D1BatchStatements = never
>(
  databaseService: Context.Service<DatabaseId, Database>,
  configuration: OAuthTargetConfiguration
) => {
  function coordinateOAuthConnected<
    D extends Database,
    S extends Family,
    AC extends Family,
    O extends Family,
    F extends Family,
    G extends Family,
    N,
    J extends Family,
    A,
    E,
    R,
    DatabaseError,
    DatabaseRequirements
  >(
    acquire: Effect.Effect<D, DatabaseError, DatabaseRequirements>,
    options: {
      readonly mapping: OAuthConnectedMapping<S, AC, O, F, G, N, J> & Extra
      readonly transaction?: never
    },
    body: Effect.Effect<A, E, R>
  ): Effect.Effect<
    A,
    OAuthCoordinatorError<E> | DatabaseError,
    | Exclude<R, OAuthConnectedPersistence | Provided>
    | Digest.Digest
    | SecureRandom.SecureRandom
    | LifecycleHooks
    | DatabaseRequirements
  >
  function coordinateOAuthConnected<
    D extends Database,
    S extends Family,
    AC extends Family,
    O extends Family,
    F extends Family,
    G extends Family,
    N,
    J extends Family,
    A,
    E,
    R,
    DatabaseError,
    DatabaseRequirements,
    TxId,
    TxShape
  >(
    acquire: Effect.Effect<D, DatabaseError, DatabaseRequirements>,
    options: {
      readonly mapping: OAuthConnectedMapping<S, AC, O, F, G, N, J> & Extra
      readonly transaction: SuppliedService<TxId, NoInfer<TransactionOf<D>>, TxShape>
    },
    body: Effect.Effect<A, E, R>
  ): Effect.Effect<
    A,
    OAuthCoordinatorError<E> | DatabaseError,
    | Exclude<R, OAuthConnectedPersistence | TxId | Provided>
    | Digest.Digest
    | SecureRandom.SecureRandom
    | LifecycleHooks
    | DatabaseRequirements
  >
  function coordinateOAuthConnected<
    D extends Database,
    S extends Family,
    AC extends Family,
    O extends Family,
    F extends Family,
    G extends Family,
    N,
    J extends Family,
    A,
    E,
    R,
    DatabaseError,
    DatabaseRequirements,
    TxId,
    TxShape
  >(
    acquire: Effect.Effect<D, DatabaseError, DatabaseRequirements>,
    options: {
      readonly mapping: OAuthConnectedMapping<S, AC, O, F, G, N, J> & Extra
      readonly transaction?: SuppliedService<TxId, NoInfer<TransactionOf<D>>, TxShape>
    },
    body: Effect.Effect<A, E, R>
  ): Effect.Effect<
    A,
    OAuthCoordinatorError<E> | DatabaseError,
    | Exclude<R, OAuthConnectedPersistence>
    | Digest.Digest
    | SecureRandom.SecureRandom
    | LifecycleHooks
    | DatabaseRequirements
  > {
    return Effect.flatMap(
      nativeDatabase(acquire),
      (database) =>
        coordinateTargetOAuthConnected<TransactionOf<D>, A, E, Exclude<R, OAuthConnectedPersistence>>(
          database,
          options.mapping,
          configuration,
          (
            transaction: TransactionOf<D>,
            services: { readonly oauthConnectedPersistence: OAuthConnectedPersistence["Service"] }
          ) => {
            const provided = Context.make(
              OAuthConnectedPersistence,
              services.oauthConnectedPersistence
            )

            const work = Effect.provideContext(body, provided)

            return options.transaction === undefined
              ? work
              : Effect.provideService(work, options.transaction, options.transaction.of(transaction))
          }
        ).pipe(Effect.provideService(NativeDatabase, database))
    )
  }
  function coordinateOAuthConnectedRevocations<
    D extends Database,
    O extends Family,
    F extends Family,
    J extends Family,
    N,
    A,
    E,
    R,
    DatabaseError,
    DatabaseRequirements
  >(
    acquire: Effect.Effect<D, DatabaseError, DatabaseRequirements>,
    options: {
      readonly mapping: OAuthConnectedRevocationMapping<O, F, J, N> & Extra
      readonly transaction?: never
    },
    body: Effect.Effect<A, E, R>
  ): Effect.Effect<
    A,
    OAuthCoordinatorError<E> | DatabaseError,
    | Exclude<R, OAuthConnectedRevocations | Provided>
    | Digest.Digest
    | SecureRandom.SecureRandom
    | LifecycleHooks
    | DatabaseRequirements
  >
  function coordinateOAuthConnectedRevocations<
    D extends Database,
    O extends Family,
    F extends Family,
    J extends Family,
    N,
    A,
    E,
    R,
    DatabaseError,
    DatabaseRequirements,
    TxId,
    TxShape
  >(
    acquire: Effect.Effect<D, DatabaseError, DatabaseRequirements>,
    options: {
      readonly mapping: OAuthConnectedRevocationMapping<O, F, J, N> & Extra
      readonly transaction: SuppliedService<TxId, NoInfer<TransactionOf<D>>, TxShape>
    },
    body: Effect.Effect<A, E, R>
  ): Effect.Effect<
    A,
    OAuthCoordinatorError<E> | DatabaseError,
    | Exclude<R, OAuthConnectedRevocations | TxId | Provided>
    | Digest.Digest
    | SecureRandom.SecureRandom
    | LifecycleHooks
    | DatabaseRequirements
  >
  function coordinateOAuthConnectedRevocations<
    D extends Database,
    O extends Family,
    F extends Family,
    J extends Family,
    N,
    A,
    E,
    R,
    DatabaseError,
    DatabaseRequirements,
    TxId,
    TxShape
  >(
    acquire: Effect.Effect<D, DatabaseError, DatabaseRequirements>,
    options: {
      readonly mapping: OAuthConnectedRevocationMapping<O, F, J, N> & Extra
      readonly transaction?: SuppliedService<TxId, NoInfer<TransactionOf<D>>, TxShape>
    },
    body: Effect.Effect<A, E, R>
  ): Effect.Effect<
    A,
    OAuthCoordinatorError<E> | DatabaseError,
    | Exclude<R, OAuthConnectedRevocations>
    | Digest.Digest
    | SecureRandom.SecureRandom
    | LifecycleHooks
    | DatabaseRequirements
  > {
    return Effect.flatMap(nativeDatabase(acquire), (database) =>
      coordinateTargetOAuthConnectedRevocations<
        TransactionOf<D>,
        A,
        E,
        Exclude<R, OAuthConnectedRevocations>
      >(
        database,
        options.mapping,
        configuration,
        (
          transaction: TransactionOf<D>,
          services: { readonly oauthConnectedRevocations: OAuthConnectedRevocations["Service"] }
        ) => {
          const provided = Context.make(
            OAuthConnectedRevocations,
            services.oauthConnectedRevocations
          )

          const work = Effect.provideContext(body, provided)

          return options.transaction === undefined
            ? work
            : Effect.provideService(work, options.transaction, options.transaction.of(transaction))
        }
      ).pipe(Effect.provideService(NativeDatabase, database)))
  }

  return {
    makeOAuthConnectedServices: <
      S extends Family,
      AC extends Family,
      O extends Family,
      F extends Family,
      G extends Family,
      N,
      J extends Family = never
    >(
      mapping: OAuthConnectedMapping<S, AC, O, F, G, N, J> & Extra
    ) =>
      makeTargetOAuthConnectedServices(mapping, configuration).pipe(
        Effect.provideServiceEffect(NativeDatabase, nativeDatabase(databaseService))
      ),
    makeOAuthConnectedRevocationServices: <O extends Family, F extends Family, J extends Family, N>(
      mapping: OAuthConnectedRevocationMapping<O, F, J, N> & Extra
    ) =>
      makeTargetOAuthConnectedRevocationServices(mapping, configuration).pipe(
        Effect.provideServiceEffect(NativeDatabase, nativeDatabase(databaseService))
      ),
    coordinateOAuthConnected,
    coordinateOAuthConnectedRevocations
  }
}
