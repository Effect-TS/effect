import type { EmailRegistrationAuthority } from "@effect/auth-persistence/Adapter"
import { EmailAddressPersistence, type EmailUnavailable } from "@effect/auth/Email"
import type { LifecycleHooks } from "@effect/auth/Hooks"
import type { Table } from "drizzle-orm"
import type * as Context from "effect/Context"
import type * as Digest from "effect/crypto/Digest"
import type * as SecureRandom from "effect/crypto/SecureRandom"
import * as Effect from "effect/Effect"

import type { NativeDriverDatabase, NativeDriverTransaction } from "./driverTypes.ts"
import type {
  AnyEmailAddressMapping,
  AnyEmailRegistrationMapping,
  AnyEmailSignInMapping,
  EmailAddressMapping,
  EmailRegistrationMapping,
  EmailSignInMapping
} from "./emailModel.ts"
import {
  coordinateTargetEmailAddress,
  coordinateTargetEmailRegistration,
  makeTargetEmailAddressServices,
  makeTargetEmailRegistrationServices,
  makeTargetEmailSignInServices
} from "./emailTarget.ts"
import { NativeDatabase, nativeDatabase } from "./nativeDatabase.ts"
import type { NativeTargetConfiguration } from "./nativeTarget.ts"
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
export const makeEmailTarget = <DatabaseId, D extends NativeDriverDatabase>(
  databaseService: Context.Service<DatabaseId, D>,
  configuration: NativeTargetConfiguration
) => {
  function coordinateEmailAddress<
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
      readonly mapping: EmailAddressMapping<S, I, C, AC, N>
      readonly transaction?: never
    } & ProofOption<Proof, PS, PN>,
    body: Effect.Effect<A, E, R>
  ): Effect.Effect<
    A,
    E | DE | EmailUnavailable,
    Exclude<R, EmailAddressPersistence> | DR | LifecycleHooks | Digest.Digest | SecureRandom.SecureRandom
  >
  function coordinateEmailAddress<
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
      readonly mapping: EmailAddressMapping<S, I, C, AC, N>
      readonly transaction: SuppliedService<
        TxId,
        NoInfer<NativeDriverTransaction<Database>>,
        TxShape
      >
    } & ProofOption<Proof, PS, PN>,
    body: Effect.Effect<A, E, R>
  ): Effect.Effect<
    A,
    E | DE | EmailUnavailable,
    Exclude<R, EmailAddressPersistence | TxId> | DR | LifecycleHooks | Digest.Digest | SecureRandom.SecureRandom
  >
  function coordinateEmailAddress<
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
      readonly mapping: EmailAddressMapping<S, I, C, AC, N>
      readonly transaction?: SuppliedService<
        TxId,
        NoInfer<NativeDriverTransaction<Database>>,
        TxShape
      >
    } & ProofOption<Proof, PS, PN>,
    body: Effect.Effect<A, E, R>
  ) {
    return Effect.flatMap(nativeDatabase(acquire), (database) =>
      coordinateTargetEmailAddress(
        database,
        options.mapping as unknown as AnyEmailAddressMapping,
        configuration,
        (
          transaction: NativeDriverTransaction<Database>,
          services
        ): Effect.Effect<A, E, Exclude<R, EmailAddressPersistence>> => {
          const work = Effect.provideService(
            body,
            EmailAddressPersistence,
            services.emailAddressPersistence
          )

          return options.transaction === undefined
            ? work
            : Effect.provideService(work, options.transaction, options.transaction.of(transaction))
        },
        options.proofMapping as unknown as AnyProofPersistenceMapping | undefined
      ))
  }

  function coordinateEmailRegistration<
    TargetId,
    Registration,
    Proof extends Table,
    PS extends Table,
    PN,
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
      readonly mapping: EmailRegistrationMapping<NoInfer<Registration>, S, I, C, AC, N>
      readonly proofMapping: ProofPersistenceMapping<Proof, PS, PN>
      readonly target: SuppliedService<TargetId, EmailRegistrationAuthority<Registration>>
      readonly transaction?: never
    },
    body: Effect.Effect<A, E, R>
  ): Effect.Effect<
    A,
    E | DE | EmailUnavailable,
    Exclude<R, TargetId> | DR | LifecycleHooks | Digest.Digest | SecureRandom.SecureRandom
  >
  function coordinateEmailRegistration<
    TargetId,
    Registration,
    Proof extends Table,
    PS extends Table,
    PN,
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
      readonly mapping: EmailRegistrationMapping<NoInfer<Registration>, S, I, C, AC, N>
      readonly proofMapping: ProofPersistenceMapping<Proof, PS, PN>
      readonly target: SuppliedService<TargetId, EmailRegistrationAuthority<Registration>>
      readonly transaction: SuppliedService<
        TxId,
        NoInfer<NativeDriverTransaction<Database>>,
        TxShape
      >
    },
    body: Effect.Effect<A, E, R>
  ): Effect.Effect<
    A,
    E | DE | EmailUnavailable,
    Exclude<R, TargetId | TxId> | DR | LifecycleHooks | Digest.Digest | SecureRandom.SecureRandom
  >
  function coordinateEmailRegistration<
    TargetId,
    Registration,
    Proof extends Table,
    PS extends Table,
    PN,
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
      readonly mapping: EmailRegistrationMapping<NoInfer<Registration>, S, I, C, AC, N>
      readonly proofMapping: ProofPersistenceMapping<Proof, PS, PN>
      readonly target: SuppliedService<TargetId, EmailRegistrationAuthority<Registration>>
      readonly transaction?: SuppliedService<
        TxId,
        NoInfer<NativeDriverTransaction<Database>>,
        TxShape
      >
    },
    body: Effect.Effect<A, E, R>
  ) {
    return Effect.flatMap(nativeDatabase(acquire), (database) =>
      coordinateTargetEmailRegistration(
        database,
        options.mapping as unknown as AnyEmailRegistrationMapping<Registration>,
        configuration,
        options.proofMapping as unknown as AnyProofPersistenceMapping,
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
    makeEmailSignInServices: <
      S extends Table,
      I extends Table,
      C extends Table,
      AC extends Table,
      N
    >(
      mapping: EmailSignInMapping<S, I, C, AC, N>
    ) =>
      makeTargetEmailSignInServices(
        mapping as unknown as AnyEmailSignInMapping,
        configuration
      ).pipe(Effect.provideServiceEffect(NativeDatabase, nativeDatabase(databaseService))),
    makeEmailAddressServices: <
      S extends Table,
      I extends Table,
      C extends Table,
      AC extends Table,
      N,
      Proof extends Table,
      PS extends Table,
      PN
    >(
      mapping: EmailAddressMapping<S, I, C, AC, N>,
      proofMapping?: ProofPersistenceMapping<Proof, PS, PN>
    ) =>
      makeTargetEmailAddressServices(
        mapping as unknown as AnyEmailAddressMapping,
        configuration,
        proofMapping as unknown as AnyProofPersistenceMapping | undefined
      ).pipe(Effect.provideServiceEffect(NativeDatabase, nativeDatabase(databaseService))),
    makeEmailRegistrationServices: <
      Registration,
      Proof extends Table,
      PS extends Table,
      PN,
      S extends Table,
      I extends Table,
      C extends Table,
      AC extends Table,
      N
    >(
      mapping: EmailRegistrationMapping<Registration, S, I, C, AC, N>,
      proofs: ProofPersistenceMapping<Proof, PS, PN>
    ) =>
      makeTargetEmailRegistrationServices(
        mapping as unknown as AnyEmailRegistrationMapping<Registration>,
        configuration,
        proofs as unknown as AnyProofPersistenceMapping
      ).pipe(Effect.provideServiceEffect(NativeDatabase, nativeDatabase(databaseService))),
    coordinateEmailAddress,
    coordinateEmailRegistration
  }
}
