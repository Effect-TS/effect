import type { PasswordRegistrationAuthority } from "@effect/auth-persistence/Adapter"
import type { LifecycleHooks } from "@effect/auth/Hooks"
import { PasswordPersistence, type PasswordUnavailable } from "@effect/auth/Password"
import type { Table } from "drizzle-orm"
import type * as Context from "effect/Context"
import type * as Digest from "effect/crypto/Digest"
import type * as SecureRandom from "effect/crypto/SecureRandom"
import * as Effect from "effect/Effect"

import type { NativeDriverDatabase, NativeDriverTransaction } from "./driverTypes.ts"
import { NativeDatabase, nativeDatabase } from "./nativeDatabase.ts"
import type { NativeTargetConfiguration } from "./nativeTarget.ts"
import type {
  AnyPasswordPersistenceMapping,
  AnyPasswordRegistrationMapping,
  PasswordPersistenceMapping,
  PasswordRegistrationMapping
} from "./passwordModel.ts"
import {
  coordinateTargetPasswordPersistence,
  coordinateTargetPasswordRegistration,
  makeTargetPasswordPersistenceServices,
  makeTargetPasswordRegistrationServices
} from "./passwordTarget.ts"
import type { AnyProofPersistenceMapping, ProofPersistenceMapping } from "./proofModel.ts"
import type { SuppliedService } from "./suppliedService.ts"

type ProofOption<Proof extends Table, Subject extends Table, NativeId> = {
  readonly proofMapping?: ProofPersistenceMapping<Proof, Subject, NativeId>
}

/**
 * Foreign table callback variance is erased only after these public signatures;
 * the target validates physical metadata and the workflow invokes row codecs.
 *
 * @internal
 */
export const makePasswordTarget = <DatabaseId, D extends NativeDriverDatabase>(
  databaseService: Context.Service<DatabaseId, D>,
  configuration: NativeTargetConfiguration
) => {
  function coordinatePasswordPersistence<
    Database extends D,
    S extends Table,
    I extends Table,
    C extends Table,
    AC extends Table,
    N,
    Proof extends Table,
    PS extends Table,
    PN,
    A,
    E,
    R,
    DE,
    DR
  >(
    acquire: Effect.Effect<Database, DE, DR>,
    options: {
      readonly mapping: PasswordPersistenceMapping<S, I, C, AC, N>
      readonly transaction?: never
    } & ProofOption<Proof, PS, PN>,
    body: Effect.Effect<A, E, R>
  ): Effect.Effect<
    A,
    E | DE | PasswordUnavailable,
    Exclude<R, PasswordPersistence> | DR | LifecycleHooks | Digest.Digest | SecureRandom.SecureRandom
  >
  function coordinatePasswordPersistence<
    Database extends D,
    S extends Table,
    I extends Table,
    C extends Table,
    AC extends Table,
    N,
    Proof extends Table,
    PS extends Table,
    PN,
    A,
    E,
    R,
    DE,
    DR,
    TxId,
    TxShape
  >(
    acquire: Effect.Effect<Database, DE, DR>,
    options: {
      readonly mapping: PasswordPersistenceMapping<S, I, C, AC, N>
      readonly transaction: SuppliedService<
        TxId,
        NoInfer<NativeDriverTransaction<Database>>,
        TxShape
      >
    } & ProofOption<Proof, PS, PN>,
    body: Effect.Effect<A, E, R>
  ): Effect.Effect<
    A,
    E | DE | PasswordUnavailable,
    Exclude<R, PasswordPersistence | TxId> | DR | LifecycleHooks | Digest.Digest | SecureRandom.SecureRandom
  >
  function coordinatePasswordPersistence<
    Database extends D,
    S extends Table,
    I extends Table,
    C extends Table,
    AC extends Table,
    N,
    Proof extends Table,
    PS extends Table,
    PN,
    A,
    E,
    R,
    DE,
    DR,
    TxId,
    TxShape
  >(
    acquire: Effect.Effect<Database, DE, DR>,
    options: {
      readonly mapping: PasswordPersistenceMapping<S, I, C, AC, N>
      readonly transaction?: SuppliedService<
        TxId,
        NoInfer<NativeDriverTransaction<Database>>,
        TxShape
      >
    } & ProofOption<Proof, PS, PN>,
    body: Effect.Effect<A, E, R>
  ) {
    return Effect.flatMap(nativeDatabase(acquire), (database) =>
      coordinateTargetPasswordPersistence(
        database,
        options.mapping as unknown as AnyPasswordPersistenceMapping,
        configuration,
        (
          transaction: NativeDriverTransaction<Database>,
          services
        ): Effect.Effect<A, E, Exclude<R, PasswordPersistence>> => {
          const work = Effect.provideService(
            body,
            PasswordPersistence,
            services.passwordPersistence
          )

          return options.transaction === undefined
            ? work
            : Effect.provideService(work, options.transaction, options.transaction.of(transaction))
        },
        options.proofMapping as unknown as AnyProofPersistenceMapping | undefined
      ))
  }

  function coordinatePasswordRegistration<
    TargetId,
    Registration,
    Database extends D,
    S extends Table,
    I extends Table,
    C extends Table,
    AC extends Table,
    N,
    A,
    E,
    R,
    DE,
    DR
  >(
    acquire: Effect.Effect<Database, DE, DR>,
    options: {
      readonly mapping: PasswordRegistrationMapping<NoInfer<Registration>, S, I, C, AC, N>
      readonly target: SuppliedService<TargetId, PasswordRegistrationAuthority<Registration>>
      readonly transaction?: never
    },
    body: Effect.Effect<A, E, R>
  ): Effect.Effect<
    A,
    E | DE | PasswordUnavailable,
    Exclude<R, TargetId> | DR | LifecycleHooks | Digest.Digest | SecureRandom.SecureRandom
  >
  function coordinatePasswordRegistration<
    TargetId,
    Registration,
    Database extends D,
    S extends Table,
    I extends Table,
    C extends Table,
    AC extends Table,
    N,
    A,
    E,
    R,
    DE,
    DR,
    TxId,
    TxShape
  >(
    acquire: Effect.Effect<Database, DE, DR>,
    options: {
      readonly mapping: PasswordRegistrationMapping<NoInfer<Registration>, S, I, C, AC, N>
      readonly target: SuppliedService<TargetId, PasswordRegistrationAuthority<Registration>>
      readonly transaction: SuppliedService<
        TxId,
        NoInfer<NativeDriverTransaction<Database>>,
        TxShape
      >
    },
    body: Effect.Effect<A, E, R>
  ): Effect.Effect<
    A,
    E | DE | PasswordUnavailable,
    Exclude<R, TargetId | TxId> | DR | LifecycleHooks | Digest.Digest | SecureRandom.SecureRandom
  >
  function coordinatePasswordRegistration<
    TargetId,
    Registration,
    Database extends D,
    S extends Table,
    I extends Table,
    C extends Table,
    AC extends Table,
    N,
    A,
    E,
    R,
    DE,
    DR,
    TxId,
    TxShape
  >(
    acquire: Effect.Effect<Database, DE, DR>,
    options: {
      readonly mapping: PasswordRegistrationMapping<NoInfer<Registration>, S, I, C, AC, N>
      readonly target: SuppliedService<TargetId, PasswordRegistrationAuthority<Registration>>
      readonly transaction?: SuppliedService<
        TxId,
        NoInfer<NativeDriverTransaction<Database>>,
        TxShape
      >
    },
    body: Effect.Effect<A, E, R>
  ) {
    return Effect.flatMap(nativeDatabase(acquire), (database) =>
      coordinateTargetPasswordRegistration(
        database,
        options.mapping as unknown as AnyPasswordRegistrationMapping<Registration>,
        configuration,
        (
          transaction: NativeDriverTransaction<Database>,
          services
        ): Effect.Effect<A, E, Exclude<R, TargetId>> => {
          const work = Effect.provideService(body, options.target, services.registrationAuthority)

          return options.transaction === undefined
            ? work
            : Effect.provideService(work, options.transaction, options.transaction.of(transaction))
        }
      ))
  }

  return {
    makePasswordPersistenceServices: <
      S extends Table,
      I extends Table,
      C extends Table,
      AC extends Table,
      N,
      Proof extends Table,
      PS extends Table,
      PN
    >(
      mapping: PasswordPersistenceMapping<S, I, C, AC, N>,
      proofMapping?: ProofPersistenceMapping<Proof, PS, PN>
    ) =>
      makeTargetPasswordPersistenceServices(
        mapping as unknown as AnyPasswordPersistenceMapping,
        configuration,
        proofMapping as unknown as AnyProofPersistenceMapping | undefined
      ).pipe(Effect.provideServiceEffect(NativeDatabase, nativeDatabase(databaseService))),
    makePasswordRegistrationServices: <
      Registration,
      S extends Table,
      I extends Table,
      C extends Table,
      AC extends Table,
      N
    >(
      mapping: PasswordRegistrationMapping<Registration, S, I, C, AC, N>
    ) =>
      makeTargetPasswordRegistrationServices(
        mapping as unknown as AnyPasswordRegistrationMapping<Registration>,
        configuration
      ).pipe(Effect.provideServiceEffect(NativeDatabase, nativeDatabase(databaseService))),
    coordinatePasswordPersistence,
    coordinatePasswordRegistration
  }
}
