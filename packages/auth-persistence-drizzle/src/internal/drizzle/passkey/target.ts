import {
  makeBatchPasskeyServices,
  makeNativePasskeyCeremonyServices,
  makeNativePasskeyCredentialServices,
  makeNativePasskeyServices,
  type NativePasskeyCeremonyMapping,
  type NativeSqlTables,
  type PasskeyNativeMapping,
  type PasskeyNativeRead,
  type SqlBatchCommit
} from "@effect/auth-persistence/Adapter"
import { LifecycleHooks } from "@effect/auth/Hooks"
import { PasskeyConfigurationError, PasskeyUnavailable } from "@effect/auth/Passkey"
import type * as Digest from "effect/crypto/Digest"
import type * as SecureRandom from "effect/crypto/SecureRandom"
import * as Effect from "effect/Effect"
import * as Predicate from "effect/Predicate"
import type * as SqlClient from "effect/sql/SqlClient"

import type { D1BatchStatements } from "../d1BatchStatements.ts"
import type { PersistenceMappingError } from "../model.ts"
import { NativeDatabase, type NativeDatabaseHandle, type NativePhysicalDatabase } from "../nativeDatabase.ts"
import { coordinateNativeTarget, nativeTarget, type NativeTargetConfiguration } from "../nativeTarget.ts"
import type { PasskeyMappingSource, PasskeyPersistenceServices } from "../passkeyModel.ts"
import { validateDrizzleStorage } from "../storageValidation.ts"
/** @internal */
export type PasskeyTargetConfiguration = NativeTargetConfiguration

export type PasskeyCoordinatorError<E> =
  | E
  | PasskeyUnavailable
  | PasskeyConfigurationError
  | PersistenceMappingError

const unavailable = () => PasskeyUnavailable.make({})

const emptyHooks: LifecycleHooks["Service"] = {
  before: () => Effect.void,
  after: () => Effect.succeed([])
}

// Mapped table/SQL generics end here. Persisted values are decoded by shared schemas.
/** @internal */
export const capturePasskeyMapping = <M, R>(
  source: PasskeyMappingSource<M, R>,
  configuration: PasskeyTargetConfiguration
) =>
  Effect.flatMap(
    Effect.isEffect(source) ? source : Effect.succeed(source),
    (mapping) =>
      validateDrizzleStorage(mapping).pipe(
        Effect.andThen(
          Effect.gen(function*() {
            if (
              configuration.mode === "batch" &&
              !(
                Predicate.isObjectOrArray(mapping) &&
                Predicate.hasProperty(mapping, "d1") &&
                Predicate.isObjectOrArray(mapping.d1) &&
                Predicate.hasProperty(mapping.d1, "primary") &&
                mapping.d1.primary === true
              )
            ) {
              return yield* PasskeyConfigurationError.make({})
            }

            return mapping
          })
        )
      )
  )

type NativePasskeyServices = Effect.Success<ReturnType<typeof makeNativePasskeyServices>>

interface PasskeyMapped<M> {
  readonly mapping: M
  readonly database: NativePhysicalDatabase
  readonly tables: NativeSqlTables
  readonly batch: SqlBatchCommit["Service"] | undefined
  readonly provide: <A, E, R>(
    effect: Effect.Effect<A, E, R>
  ) => Effect.Effect<A, E, Exclude<Exclude<R, SqlClient.SqlClient>, SqlBatchCommit>>
  readonly base: () => Effect.Effect<
    NativePasskeyServices,
    PasskeyUnavailable,
    Digest.Digest | SecureRandom.SecureRandom | LifecycleHooks
  >
}

/** @internal */
export const makePasskeyMapped = Effect.fnUntraced(function*<M, R>(
  source: PasskeyMappingSource<M, R>,
  configuration: PasskeyTargetConfiguration
): Effect.fn.Return<
  PasskeyMapped<M>,
  PasskeyConfigurationError | PersistenceMappingError,
  R | NativeDatabase
> {
  const mapping = yield* capturePasskeyMapping(source, configuration)
  const database = yield* NativeDatabase
  const { tables, batch, provide } = yield* nativeTarget(configuration)
  const native = mapping as unknown as PasskeyNativeMapping

  return {
    mapping,
    database,
    tables,
    batch,
    provide,
    base: () =>
      provide(
        configuration.mode === "batch"
          ? makeBatchPasskeyServices(tables, native)
          : makeNativePasskeyServices(tables, native)
      )
  }
})

/** @internal */
export const makeTargetPasskeyCredentials = Effect.fnUntraced(
  function*<M, R>(source: PasskeyMappingSource<M, R>, configuration: PasskeyTargetConfiguration) {
    const target = yield* makePasskeyMapped(source, configuration)

    return yield* target
      .provide(
        makeNativePasskeyCredentialServices(
          target.tables,
          target.mapping as unknown as PasskeyNativeRead
        )
      )
      .pipe(Effect.provideService(LifecycleHooks, emptyHooks))
  }
)

/** @internal */
export const makeTargetPasskeyPersistence = Effect.fnUntraced(
  function*<M, R>(source: PasskeyMappingSource<M, R>, configuration: PasskeyTargetConfiguration) {
    const target = yield* makePasskeyMapped(source, configuration)

    const base = yield* target.base()

    return { passkeyPersistence: base.passkeyPersistence } satisfies PasskeyPersistenceServices
  }
)

/** @internal */
export const makeTargetPasskeyRegistration = Effect.fnUntraced(
  function*<M, R>(source: PasskeyMappingSource<M, R>, configuration: PasskeyTargetConfiguration) {
    const target = yield* makePasskeyMapped(source, configuration)

    return yield* target.provide(
      makeNativePasskeyCeremonyServices(
        target.tables,
        target.mapping as unknown as NativePasskeyCeremonyMapping,
        configuration.mode === "batch" ? target.batch : undefined
      )
    )
  }
)

/** @internal */
export const coordinatePasskeyOwner = <S, Transaction, A, E, R, ESetup, RSetup>(
  database: NativeDatabaseHandle,
  configuration: PasskeyTargetConfiguration,
  make: Effect.Effect<S, ESetup, RSetup>,
  body: (transaction: Transaction, services: S) => Effect.Effect<A, E, R>
): Effect.Effect<
  A,
  E | PasskeyUnavailable,
  Exclude<R, D1BatchStatements> | RSetup | LifecycleHooks
> => coordinateNativeTarget(unavailable, database, configuration, make, body)

/** @internal */
export const coordinateTargetPasskey = <M, RSetup, Transaction, A, E, R>(
  database: NativeDatabaseHandle,
  source: PasskeyMappingSource<M, RSetup>,
  configuration: PasskeyTargetConfiguration,
  body: (
    transaction: Transaction,
    services: Effect.Success<ReturnType<typeof makeTargetPasskeyPersistence>>
  ) => Effect.Effect<A, E, R>
) =>
  coordinatePasskeyOwner(
    database,
    configuration,
    makeTargetPasskeyPersistence(source, configuration),
    body
  )

/** @internal */
export const coordinateTargetPasskeyRegistration = <M, RSetup, Transaction, A, E, R>(
  database: NativeDatabaseHandle,
  source: PasskeyMappingSource<M, RSetup>,
  configuration: PasskeyTargetConfiguration,
  body: (
    transaction: Transaction,
    services: Effect.Success<ReturnType<typeof makeTargetPasskeyRegistration>>
  ) => Effect.Effect<A, E, R>
) =>
  coordinatePasskeyOwner(
    database,
    configuration,
    makeTargetPasskeyRegistration(source, configuration),
    body
  )
