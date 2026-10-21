import type { LifecycleHooks } from "@effect/auth/Hooks"
import { PasskeyPersistence } from "@effect/auth/Passkey"
import type { Table } from "drizzle-orm"
import * as Context from "effect/Context"
import type * as Digest from "effect/crypto/Digest"
import type * as SecureRandom from "effect/crypto/SecureRandom"
import * as Effect from "effect/Effect"

import type { D1BatchStatements } from "./d1BatchStatements.ts"
import { NativeDatabase, nativeDatabase } from "./nativeDatabase.ts"
import {
  coordinateTargetPasskey,
  coordinateTargetPasskeyRegistration,
  makeTargetPasskeyCredentials,
  makeTargetPasskeyPersistence,
  makeTargetPasskeyRegistration,
  type PasskeyCoordinatorError,
  type PasskeyTargetConfiguration
} from "./passkey/target.ts"
import type {
  PasskeyCredentialMapping,
  PasskeyMappingSource,
  PasskeyPersistenceMapping,
  PasskeyPersistenceServices
} from "./passkeyModel.ts"
import type {
  PasskeyRegistrationCeremonyMapping,
  PasskeyRegistrationCeremonyServices
} from "./passkeyRegistrationCeremonyModel.ts"
import { makePasskeyWriteTarget } from "./passkeyWriteDrivers.ts"
import type { SuppliedService } from "./suppliedService.ts"

// oxlint-disable-next-line no-explicit-any -- inspect only the concrete database's installed generic transaction callback.
type TransactionOf<D> = D extends { readonly transaction: (...args: Array<any>) => any }
  ? Parameters<Parameters<D["transaction"]>[0]>[0]
  : never

/** @internal */
export const makePasskeyTarget = <
  DatabaseId,
  D,
  T extends Table,
  Extra = unknown,
  Provided extends D1BatchStatements = never
>(
  databaseService: Context.Service<DatabaseId, D>,
  configuration: PasskeyTargetConfiguration
) => {
  function coordinatePasskeyPersistence<
    Database extends D,
    S extends T,
    C extends T,
    F extends T,
    Flow extends T,
    N,
    A,
    E,
    R,
    RSetup = never,
    DatabaseError = never,
    DatabaseRequirements = never
  >(
    acquire: Effect.Effect<Database, DatabaseError, DatabaseRequirements>,
    options: {
      readonly mapping: PasskeyMappingSource<
        PasskeyPersistenceMapping<PasskeyCredentialMapping<S, C, F, N>, Flow, N> & Extra,
        RSetup
      >
      readonly transaction?: never
    },
    body: Effect.Effect<A, E, R>
  ): Effect.Effect<
    A,
    PasskeyCoordinatorError<E> | DatabaseError,
    | Exclude<R, PasskeyPersistence | Provided>
    | Digest.Digest
    | SecureRandom.SecureRandom
    | LifecycleHooks
    | DatabaseRequirements
    | RSetup
  >
  function coordinatePasskeyPersistence<
    Database extends D,
    S extends T,
    C extends T,
    F extends T,
    Flow extends T,
    N,
    A,
    E,
    R,
    TxId,
    TxShape,
    RSetup = never,
    DatabaseError = never,
    DatabaseRequirements = never
  >(
    acquire: Effect.Effect<Database, DatabaseError, DatabaseRequirements>,
    options: {
      readonly mapping: PasskeyMappingSource<
        PasskeyPersistenceMapping<PasskeyCredentialMapping<S, C, F, N>, Flow, N> & Extra,
        RSetup
      >
      readonly transaction: SuppliedService<
        TxId,
        NoInfer<[Provided] extends [never] ? TransactionOf<Database> : never>,
        TxShape
      >
    },
    body: Effect.Effect<A, E, R>
  ): Effect.Effect<
    A,
    PasskeyCoordinatorError<E> | DatabaseError,
    | Exclude<R, PasskeyPersistence | TxId | Provided>
    | Digest.Digest
    | SecureRandom.SecureRandom
    | LifecycleHooks
    | DatabaseRequirements
    | RSetup
  >
  function coordinatePasskeyPersistence<
    Database extends D,
    S extends T,
    C extends T,
    F extends T,
    Flow extends T,
    N,
    A,
    E,
    R,
    TxId,
    TxShape,
    RSetup = never,
    DatabaseError = never,
    DatabaseRequirements = never
  >(
    acquire: Effect.Effect<Database, DatabaseError, DatabaseRequirements>,
    options: {
      readonly mapping: PasskeyMappingSource<
        PasskeyPersistenceMapping<PasskeyCredentialMapping<S, C, F, N>, Flow, N> & Extra,
        RSetup
      >
      readonly transaction?: SuppliedService<TxId, NoInfer<TransactionOf<Database>>, TxShape>
    },
    body: Effect.Effect<A, E, R>
  ): Effect.Effect<
    A,
    PasskeyCoordinatorError<E> | DatabaseError,
    | Exclude<R, PasskeyPersistence>
    | Digest.Digest
    | SecureRandom.SecureRandom
    | LifecycleHooks
    | DatabaseRequirements
    | RSetup
  > {
    return Effect.flatMap(nativeDatabase(acquire), (database) =>
      coordinateTargetPasskey(
        database,
        options.mapping,
        configuration,
        (transaction: TransactionOf<Database>, services: PasskeyPersistenceServices) => {
          const provided = Context.make(PasskeyPersistence, services.passkeyPersistence)
          const work = Effect.provideContext(body, provided)

          return options.transaction === undefined
            ? work
            : Effect.provideService(work, options.transaction, options.transaction.of(transaction))
        }
      ).pipe(Effect.provideService(NativeDatabase, database)))
  }
  function coordinatePasskeyRegistrationCeremony<
    Database extends D,
    Flow extends T,
    A,
    E,
    R,
    RSetup = never,
    DatabaseError = never,
    DatabaseRequirements = never
  >(
    acquire: Effect.Effect<Database, DatabaseError, DatabaseRequirements>,
    options: {
      readonly mapping: PasskeyMappingSource<
        PasskeyRegistrationCeremonyMapping<Flow> & Extra,
        RSetup
      >
      readonly transaction?: never
    },
    body: Effect.Effect<A, E, R>
  ): Effect.Effect<
    A,
    PasskeyCoordinatorError<E> | DatabaseError,
    | Exclude<R, PasskeyPersistence | Provided>
    | Digest.Digest
    | SecureRandom.SecureRandom
    | LifecycleHooks
    | DatabaseRequirements
    | RSetup
  >
  function coordinatePasskeyRegistrationCeremony<
    Database extends D,
    Flow extends T,
    A,
    E,
    R,
    TxId,
    TxShape,
    RSetup = never,
    DatabaseError = never,
    DatabaseRequirements = never
  >(
    acquire: Effect.Effect<Database, DatabaseError, DatabaseRequirements>,
    options: {
      readonly mapping: PasskeyMappingSource<
        PasskeyRegistrationCeremonyMapping<Flow> & Extra,
        RSetup
      >
      readonly transaction: SuppliedService<
        TxId,
        NoInfer<[Provided] extends [never] ? TransactionOf<Database> : never>,
        TxShape
      >
    },
    body: Effect.Effect<A, E, R>
  ): Effect.Effect<
    A,
    PasskeyCoordinatorError<E> | DatabaseError,
    | Exclude<R, PasskeyPersistence | TxId | Provided>
    | Digest.Digest
    | SecureRandom.SecureRandom
    | LifecycleHooks
    | DatabaseRequirements
    | RSetup
  >
  function coordinatePasskeyRegistrationCeremony<
    Database extends D,
    Flow extends T,
    A,
    E,
    R,
    TxId,
    TxShape,
    RSetup = never,
    DatabaseError = never,
    DatabaseRequirements = never
  >(
    acquire: Effect.Effect<Database, DatabaseError, DatabaseRequirements>,
    options: {
      readonly mapping: PasskeyMappingSource<
        PasskeyRegistrationCeremonyMapping<Flow> & Extra,
        RSetup
      >
      readonly transaction?: SuppliedService<TxId, NoInfer<TransactionOf<Database>>, TxShape>
    },
    body: Effect.Effect<A, E, R>
  ): Effect.Effect<
    A,
    PasskeyCoordinatorError<E> | DatabaseError,
    | Exclude<R, PasskeyPersistence>
    | Digest.Digest
    | SecureRandom.SecureRandom
    | LifecycleHooks
    | DatabaseRequirements
    | RSetup
  > {
    return Effect.flatMap(nativeDatabase(acquire), (database) =>
      coordinateTargetPasskeyRegistration(
        database,
        options.mapping,
        configuration,
        (transaction: TransactionOf<Database>, services: PasskeyRegistrationCeremonyServices) => {
          const provided = Context.make(PasskeyPersistence, services.passkeyPersistence)
          const work = Effect.provideContext(body, provided)

          return options.transaction === undefined
            ? work
            : Effect.provideService(work, options.transaction, options.transaction.of(transaction))
        }
      ).pipe(Effect.provideService(NativeDatabase, database)))
  }

  return {
    ...makePasskeyWriteTarget<DatabaseId, D, T, Extra, Provided>(databaseService, configuration),
    makePasskeyCredentialServices: <S extends T, C extends T, F extends T, N, RSetup = never>(
      mapping: PasskeyMappingSource<PasskeyCredentialMapping<S, C, F, N> & Extra, RSetup>
    ) =>
      makeTargetPasskeyCredentials(mapping, configuration).pipe(
        Effect.provideServiceEffect(NativeDatabase, nativeDatabase(databaseService))
      ),
    makePasskeyPersistenceServices: <
      S extends T,
      C extends T,
      F extends T,
      Flow extends T,
      N,
      RSetup = never
    >(
      mapping: PasskeyMappingSource<
        PasskeyPersistenceMapping<PasskeyCredentialMapping<S, C, F, N>, Flow, N> & Extra,
        RSetup
      >
    ) =>
      makeTargetPasskeyPersistence(mapping, configuration).pipe(
        Effect.provideServiceEffect(NativeDatabase, nativeDatabase(databaseService))
      ),
    makePasskeyRegistrationCeremonyServices: <Flow extends T, RSetup = never>(
      mapping: PasskeyMappingSource<PasskeyRegistrationCeremonyMapping<Flow> & Extra, RSetup>
    ) =>
      makeTargetPasskeyRegistration(mapping, configuration).pipe(
        Effect.provideServiceEffect(NativeDatabase, nativeDatabase(databaseService))
      ),
    coordinatePasskeyPersistence,
    coordinatePasskeyRegistrationCeremony
  }
}
