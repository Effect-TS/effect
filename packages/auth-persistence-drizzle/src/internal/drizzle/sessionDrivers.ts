import {
  makeNativeAuthenticationAuthorityServices,
  makeNativePendingAuthenticationServices,
  makeNativeSessionCleanupServices,
  makeNativeSessionStepUpServices,
  makeNativeSignedSessionValidityServices,
  makeNativeStatefulSessionServices,
  type NativeAuthenticationAuthorityMapping,
  type NativePendingAuthenticationMapping,
  type NativeSessionStepUpMapping,
  type NativeSignedSessionValidityMapping,
  type NativeStatefulSessionMapping
} from "@effect/auth-persistence/Adapter"
import type { LifecycleHooks } from "@effect/auth/Hooks"
import { reportAuthDiagnostic } from "@effect/auth/Persistence"
import {
  AuthenticationAuthority,
  type PendingAuthentication,
  type SessionRepository,
  type SessionStepUpPersistence,
  SessionUnavailable,
  type SignedSessionValidity,
  type StatefulSessionPersistence
} from "@effect/auth/Sessions"
import type { Table } from "drizzle-orm"
import * as Cause from "effect/Cause"
import type * as Context from "effect/Context"
import * as Effect from "effect/Effect"

import type { NativeDriverDatabase, NativeDriverTransaction } from "./driverTypes.ts"
import { type MappedClock, nativeClock } from "./nativeClock.ts"
import { NativeDatabase, nativeDatabase } from "./nativeDatabase.ts"
import { coordinateNativeTarget, nativeTarget, type NativeTargetConfiguration } from "./nativeTarget.ts"
import type {
  AuthenticationAuthorityMapping,
  PendingAuthenticationMapping,
  SessionCleanupMapping,
  SignedSessionValidityMapping,
  StatefulSessionMapping
} from "./sessionModel.ts"
import type { SessionStepUpMapping } from "./stepUpModel.ts"
import { validateDrizzleStorage } from "./storageValidation.ts"
import type { SuppliedService } from "./suppliedService.ts"

const unavailable = () => SessionUnavailable.make({})

const clockMapping = <T extends { readonly clock: MappedClock }>(mapping: T) => ({
  ...mapping,
  clock: nativeClock(mapping.clock)
})

/**
 * Foreign table/ID callback variance is erased only at this physical mapping
 * boundary. All subjects, sessions, pending payloads and policy use their codecs.
 *
 * @internal
 */
export const makeSessionTarget = <DatabaseId, D extends NativeDriverDatabase>(
  databaseService: Context.Service<DatabaseId, D>,
  configuration: NativeTargetConfiguration
) => {
  const authenticationAuthority = Effect.fnUntraced(
    function*<Claims>(mapping: NativeAuthenticationAuthorityMapping<Claims>) {
      yield* validateDrizzleStorage(mapping).pipe(
        Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, unavailable)))
      )
      if (
        configuration.mode === "batch" &&
        (mapping.d1?.primary !== true || mapping.subject.requirementColumns === undefined)
      ) {
        return yield* reportAuthDiagnostic("persistence-validation", "configuration").pipe(
          Effect.andThen(unavailable())
        )
      }
      const target = yield* nativeTarget(configuration)

      return yield* target.provide(
        makeNativeAuthenticationAuthorityServices(target.tables, mapping)
      )
    }
  )

  function coordinateAuthenticationAuthority<
    DB extends D,
    Claims,
    S extends Table,
    C extends Table,
    P extends Table,
    N,
    A,
    E,
    R,
    DE,
    DR
  >(
    acquire: Effect.Effect<DB, DE, DR>,
    options: {
      readonly mapping: AuthenticationAuthorityMapping<Claims, S, C, P, N>
      readonly transaction?: never
    },
    body: Effect.Effect<A, E, R>
  ): Effect.Effect<
    A,
    E | DE | SessionUnavailable,
    Exclude<R, AuthenticationAuthority> | DR | LifecycleHooks
  >
  function coordinateAuthenticationAuthority<
    DB extends D,
    Claims,
    S extends Table,
    C extends Table,
    P extends Table,
    N,
    A,
    E,
    R,
    DE,
    DR,
    TxId,
    TxShape
  >(
    acquire: Effect.Effect<DB, DE, DR>,
    options: {
      readonly mapping: AuthenticationAuthorityMapping<Claims, S, C, P, N>
      readonly transaction: SuppliedService<TxId, NoInfer<NativeDriverTransaction<DB>>, TxShape>
    },
    body: Effect.Effect<A, E, R>
  ): Effect.Effect<
    A,
    E | DE | SessionUnavailable,
    Exclude<R, AuthenticationAuthority | TxId> | DR | LifecycleHooks
  >
  function coordinateAuthenticationAuthority<
    DB extends D,
    Claims,
    S extends Table,
    C extends Table,
    P extends Table,
    N,
    A,
    E,
    R,
    DE,
    DR,
    TxId,
    TxShape
  >(
    acquire: Effect.Effect<DB, DE, DR>,
    options: {
      readonly mapping: AuthenticationAuthorityMapping<Claims, S, C, P, N>
      readonly transaction?: SuppliedService<TxId, NoInfer<NativeDriverTransaction<DB>>, TxShape>
    },
    body: Effect.Effect<A, E, R>
  ) {
    return Effect.flatMap(nativeDatabase(acquire), (database) =>
      coordinateNativeTarget(
        unavailable,
        database,
        configuration,
        authenticationAuthority(
          clockMapping(options.mapping) as unknown as NativeAuthenticationAuthorityMapping<Claims>
        ),
        (
          transaction: NativeDriverTransaction<DB>,
          services
        ): Effect.Effect<A, E, Exclude<R, AuthenticationAuthority>> => {
          const work = body.pipe(
            Effect.provideService(AuthenticationAuthority, services.authenticationAuthority)
          )

          return options.transaction === undefined
            ? work
            : Effect.provideService(work, options.transaction, options.transaction.of(transaction))
        }
      ))
  }

  const pendingAuthentication = Effect.fnUntraced(
    function*<Claims>(mapping: NativePendingAuthenticationMapping<Claims>) {
      yield* validateDrizzleStorage(mapping).pipe(
        Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, unavailable)))
      )
      if (
        configuration.mode === "batch" &&
        (mapping.d1?.primary !== true || mapping.subject.requirementColumns === undefined)
      ) {
        return yield* reportAuthDiagnostic("persistence-validation", "configuration").pipe(
          Effect.andThen(unavailable())
        )
      }
      const target = yield* nativeTarget(configuration)

      return yield* target.provide(makeNativePendingAuthenticationServices(target.tables, mapping))
    }
  )

  function coordinatePendingAuthentication<
    DB extends D,
    Id,
    Claims,
    S extends Table,
    C extends Table,
    P extends Table,
    N,
    A,
    E,
    R,
    DE,
    DR
  >(
    acquire: Effect.Effect<DB, DE, DR>,
    options: {
      readonly mapping: PendingAuthenticationMapping<NoInfer<Claims>, S, C, P, N>
      readonly target: SuppliedService<Id, PendingAuthentication<Claims>>
      readonly transaction?: never
    },
    body: Effect.Effect<A, E, R>
  ): Effect.Effect<A, E | DE | SessionUnavailable, Exclude<R, Id> | DR | LifecycleHooks>
  function coordinatePendingAuthentication<
    DB extends D,
    Id,
    Claims,
    S extends Table,
    C extends Table,
    P extends Table,
    N,
    A,
    E,
    R,
    DE,
    DR,
    TxId,
    TxShape
  >(
    acquire: Effect.Effect<DB, DE, DR>,
    options: {
      readonly mapping: PendingAuthenticationMapping<NoInfer<Claims>, S, C, P, N>
      readonly target: SuppliedService<Id, PendingAuthentication<Claims>>
      readonly transaction: SuppliedService<TxId, NoInfer<NativeDriverTransaction<DB>>, TxShape>
    },
    body: Effect.Effect<A, E, R>
  ): Effect.Effect<A, E | DE | SessionUnavailable, Exclude<R, Id | TxId> | DR | LifecycleHooks>
  function coordinatePendingAuthentication<
    DB extends D,
    Id,
    Claims,
    S extends Table,
    C extends Table,
    P extends Table,
    N,
    A,
    E,
    R,
    DE,
    DR,
    TxId,
    TxShape
  >(
    acquire: Effect.Effect<DB, DE, DR>,
    options: {
      readonly mapping: PendingAuthenticationMapping<NoInfer<Claims>, S, C, P, N>
      readonly target: SuppliedService<Id, PendingAuthentication<Claims>>
      readonly transaction?: SuppliedService<TxId, NoInfer<NativeDriverTransaction<DB>>, TxShape>
    },
    body: Effect.Effect<A, E, R>
  ) {
    return Effect.flatMap(nativeDatabase(acquire), (database) =>
      coordinateNativeTarget(
        unavailable,
        database,
        configuration,
        pendingAuthentication(
          clockMapping(options.mapping) as unknown as NativePendingAuthenticationMapping<Claims>
        ),
        (
          transaction: NativeDriverTransaction<DB>,
          services
        ): Effect.Effect<A, E, Exclude<R, Id>> => {
          const work = body.pipe(
            Effect.provideService(options.target, services.pendingAuthentication)
          )

          return options.transaction === undefined
            ? work
            : Effect.provideService(work, options.transaction, options.transaction.of(transaction))
        }
      ))
  }

  const statefulSessionPersistence = Effect.fnUntraced(
    function*<Claims>(mapping: NativeStatefulSessionMapping<Claims>) {
      yield* validateDrizzleStorage(mapping).pipe(
        Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, unavailable)))
      )
      if (
        configuration.mode === "batch" &&
        (mapping.d1?.primary !== true || mapping.subject.requirementColumns === undefined)
      ) {
        return yield* reportAuthDiagnostic("persistence-validation", "configuration").pipe(
          Effect.andThen(unavailable())
        )
      }
      const target = yield* nativeTarget(configuration)

      return yield* target.provide(makeNativeStatefulSessionServices(target.tables, mapping))
    }
  )

  function coordinateStatefulSessions<
    DB extends D,
    Id,
    RepositoryId,
    Claims,
    S extends Table,
    C extends Table,
    Session extends Table,
    P extends Table,
    N,
    NS,
    A,
    E,
    R,
    DE,
    DR
  >(
    acquire: Effect.Effect<DB, DE, DR>,
    options: {
      readonly mapping: StatefulSessionMapping<NoInfer<Claims>, S, C, Session, P, N, NS>
      readonly persistence: SuppliedService<Id, StatefulSessionPersistence<Claims>>
      readonly repository: SuppliedService<RepositoryId, SessionRepository>
      readonly transaction?: never
    },
    body: Effect.Effect<A, E, R>
  ): Effect.Effect<
    A,
    E | DE | SessionUnavailable,
    Exclude<R, Id | RepositoryId> | DR | LifecycleHooks
  >
  function coordinateStatefulSessions<
    DB extends D,
    Id,
    RepositoryId,
    Claims,
    S extends Table,
    C extends Table,
    Session extends Table,
    P extends Table,
    N,
    NS,
    A,
    E,
    R,
    DE,
    DR,
    TxId,
    TxShape
  >(
    acquire: Effect.Effect<DB, DE, DR>,
    options: {
      readonly mapping: StatefulSessionMapping<NoInfer<Claims>, S, C, Session, P, N, NS>
      readonly persistence: SuppliedService<Id, StatefulSessionPersistence<Claims>>
      readonly repository: SuppliedService<RepositoryId, SessionRepository>
      readonly transaction: SuppliedService<TxId, NoInfer<NativeDriverTransaction<DB>>, TxShape>
    },
    body: Effect.Effect<A, E, R>
  ): Effect.Effect<
    A,
    E | DE | SessionUnavailable,
    Exclude<R, Id | RepositoryId | TxId> | DR | LifecycleHooks
  >
  function coordinateStatefulSessions<
    DB extends D,
    Id,
    RepositoryId,
    Claims,
    S extends Table,
    C extends Table,
    Session extends Table,
    P extends Table,
    N,
    NS,
    A,
    E,
    R,
    DE,
    DR,
    TxId,
    TxShape
  >(
    acquire: Effect.Effect<DB, DE, DR>,
    options: {
      readonly mapping: StatefulSessionMapping<NoInfer<Claims>, S, C, Session, P, N, NS>
      readonly persistence: SuppliedService<Id, StatefulSessionPersistence<Claims>>
      readonly repository: SuppliedService<RepositoryId, SessionRepository>
      readonly transaction?: SuppliedService<TxId, NoInfer<NativeDriverTransaction<DB>>, TxShape>
    },
    body: Effect.Effect<A, E, R>
  ) {
    return Effect.flatMap(nativeDatabase(acquire), (database) =>
      coordinateNativeTarget(
        unavailable,
        database,
        configuration,
        statefulSessionPersistence(
          clockMapping(options.mapping) as unknown as NativeStatefulSessionMapping<Claims>
        ),
        (
          transaction: NativeDriverTransaction<DB>,
          services
        ): Effect.Effect<A, E, Exclude<Exclude<R, Id>, RepositoryId>> => {
          const work = body.pipe(
            Effect.provideService(options.persistence, services.statefulSessionPersistence),
            Effect.provideService(options.repository, services.sessionRepository)
          )

          return options.transaction === undefined
            ? work
            : Effect.provideService(work, options.transaction, options.transaction.of(transaction))
        }
      ))
  }

  const signedSessionValidity = Effect.fnUntraced(function*(mapping: NativeSignedSessionValidityMapping) {
    yield* validateDrizzleStorage(mapping).pipe(
      Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, unavailable)))
    )
    if (configuration.mode === "batch" && mapping.d1?.primary !== true) {
      return yield* reportAuthDiagnostic("persistence-validation", "configuration").pipe(
        Effect.andThen(unavailable())
      )
    }
    const target = yield* nativeTarget(configuration)

    return yield* target.provide(makeNativeSignedSessionValidityServices(target.tables, mapping))
  })

  function coordinateSignedSessionValidity<
    DB extends D,
    Id,
    S extends Table,
    T extends Table,
    N,
    NS,
    A,
    E,
    R,
    DE,
    DR
  >(
    acquire: Effect.Effect<DB, DE, DR>,
    options: {
      readonly mapping: SignedSessionValidityMapping<S, T, N, NS>
      readonly target: SuppliedService<Id, SignedSessionValidity>
      readonly transaction?: never
    },
    body: Effect.Effect<A, E, R>
  ): Effect.Effect<A, E | DE | SessionUnavailable, Exclude<R, Id> | DR | LifecycleHooks>
  function coordinateSignedSessionValidity<
    DB extends D,
    Id,
    S extends Table,
    T extends Table,
    N,
    NS,
    A,
    E,
    R,
    DE,
    DR,
    TxId,
    TxShape
  >(
    acquire: Effect.Effect<DB, DE, DR>,
    options: {
      readonly mapping: SignedSessionValidityMapping<S, T, N, NS>
      readonly target: SuppliedService<Id, SignedSessionValidity>
      readonly transaction: SuppliedService<TxId, NoInfer<NativeDriverTransaction<DB>>, TxShape>
    },
    body: Effect.Effect<A, E, R>
  ): Effect.Effect<A, E | DE | SessionUnavailable, Exclude<R, Id | TxId> | DR | LifecycleHooks>
  function coordinateSignedSessionValidity<
    DB extends D,
    Id,
    S extends Table,
    T extends Table,
    N,
    NS,
    A,
    E,
    R,
    DE,
    DR,
    TxId,
    TxShape
  >(
    acquire: Effect.Effect<DB, DE, DR>,
    options: {
      readonly mapping: SignedSessionValidityMapping<S, T, N, NS>
      readonly target: SuppliedService<Id, SignedSessionValidity>
      readonly transaction?: SuppliedService<TxId, NoInfer<NativeDriverTransaction<DB>>, TxShape>
    },
    body: Effect.Effect<A, E, R>
  ) {
    return Effect.flatMap(nativeDatabase(acquire), (database) =>
      coordinateNativeTarget(
        unavailable,
        database,
        configuration,
        signedSessionValidity(
          clockMapping(options.mapping) as unknown as NativeSignedSessionValidityMapping
        ),
        (
          transaction: NativeDriverTransaction<DB>,
          services
        ): Effect.Effect<A, E, Exclude<R, Id>> => {
          const work = body.pipe(
            Effect.provideService(options.target, services.signedSessionValidity)
          )

          return options.transaction === undefined
            ? work
            : Effect.provideService(work, options.transaction, options.transaction.of(transaction))
        }
      ))
  }

  const sessionStepUpPersistence = Effect.fnUntraced(function*<Claims>(mapping: NativeSessionStepUpMapping<Claims>) {
    yield* validateDrizzleStorage(mapping).pipe(
      Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, unavailable)))
    )
    if (
      configuration.mode === "batch" &&
      (mapping.d1?.primary !== true || mapping.subject.requirementColumns === undefined)
    ) {
      return yield* reportAuthDiagnostic("persistence-validation", "configuration").pipe(
        Effect.andThen(unavailable())
      )
    }
    const target = yield* nativeTarget(configuration)

    return yield* target.provide(makeNativeSessionStepUpServices(target.tables, mapping))
  })

  function coordinateSessionStepUp<
    DB extends D,
    Id,
    Claims,
    S extends Table,
    C extends Table,
    P extends Table,
    Session extends Table,
    T extends Table,
    N,
    NS,
    A,
    E,
    R,
    DE,
    DR
  >(
    acquire: Effect.Effect<DB, DE, DR>,
    options: {
      readonly mapping: SessionStepUpMapping<NoInfer<Claims>, S, C, P, Session, T, N, NS>
      readonly target: SuppliedService<Id, SessionStepUpPersistence<Claims>>
      readonly transaction?: never
    },
    body: Effect.Effect<A, E, R>
  ): Effect.Effect<A, E | DE | SessionUnavailable, Exclude<R, Id> | DR | LifecycleHooks>
  function coordinateSessionStepUp<
    DB extends D,
    Id,
    Claims,
    S extends Table,
    C extends Table,
    P extends Table,
    Session extends Table,
    T extends Table,
    N,
    NS,
    A,
    E,
    R,
    DE,
    DR,
    TxId,
    TxShape
  >(
    acquire: Effect.Effect<DB, DE, DR>,
    options: {
      readonly mapping: SessionStepUpMapping<NoInfer<Claims>, S, C, P, Session, T, N, NS>
      readonly target: SuppliedService<Id, SessionStepUpPersistence<Claims>>
      readonly transaction: SuppliedService<TxId, NoInfer<NativeDriverTransaction<DB>>, TxShape>
    },
    body: Effect.Effect<A, E, R>
  ): Effect.Effect<A, E | DE | SessionUnavailable, Exclude<R, Id | TxId> | DR | LifecycleHooks>
  function coordinateSessionStepUp<
    DB extends D,
    Id,
    Claims,
    S extends Table,
    C extends Table,
    P extends Table,
    Session extends Table,
    T extends Table,
    N,
    NS,
    A,
    E,
    R,
    DE,
    DR,
    TxId,
    TxShape
  >(
    acquire: Effect.Effect<DB, DE, DR>,
    options: {
      readonly mapping: SessionStepUpMapping<NoInfer<Claims>, S, C, P, Session, T, N, NS>
      readonly target: SuppliedService<Id, SessionStepUpPersistence<Claims>>
      readonly transaction?: SuppliedService<TxId, NoInfer<NativeDriverTransaction<DB>>, TxShape>
    },
    body: Effect.Effect<A, E, R>
  ) {
    return Effect.flatMap(nativeDatabase(acquire), (database) =>
      coordinateNativeTarget(
        unavailable,
        database,
        configuration,
        sessionStepUpPersistence(
          clockMapping(options.mapping) as unknown as NativeSessionStepUpMapping<Claims>
        ),
        (
          transaction: NativeDriverTransaction<DB>,
          services
        ): Effect.Effect<A, E, Exclude<R, Id>> => {
          const work = body.pipe(
            Effect.provideService(options.target, services.sessionStepUpPersistence)
          )

          return options.transaction === undefined
            ? work
            : Effect.provideService(work, options.transaction, options.transaction.of(transaction))
        }
      ))
  }

  return {
    coordinateAuthenticationAuthority,
    makeAuthenticationAuthorityServices: <
      Claims,
      S extends Table,
      C extends Table,
      P extends Table,
      N
    >(
      mapping: AuthenticationAuthorityMapping<Claims, S, C, P, N>
    ) =>
      authenticationAuthority(
        clockMapping(mapping) as unknown as NativeAuthenticationAuthorityMapping<Claims>
      ).pipe(Effect.provideServiceEffect(NativeDatabase, nativeDatabase(databaseService))),
    coordinatePendingAuthentication,
    makePendingAuthenticationServices: <
      Claims,
      S extends Table,
      C extends Table,
      P extends Table,
      N
    >(
      mapping: PendingAuthenticationMapping<Claims, S, C, P, N>
    ) =>
      pendingAuthentication(
        clockMapping(mapping) as unknown as NativePendingAuthenticationMapping<Claims>
      ).pipe(Effect.provideServiceEffect(NativeDatabase, nativeDatabase(databaseService))),
    coordinateStatefulSessions,
    makeStatefulSessionServices: <
      Claims,
      S extends Table,
      C extends Table,
      Session extends Table,
      P extends Table,
      N,
      NS
    >(
      mapping: StatefulSessionMapping<Claims, S, C, Session, P, N, NS>
    ) =>
      statefulSessionPersistence(
        clockMapping(mapping) as unknown as NativeStatefulSessionMapping<Claims>
      ).pipe(Effect.provideServiceEffect(NativeDatabase, nativeDatabase(databaseService))),
    coordinateSignedSessionValidity,
    makeSignedSessionValidityServices: <S extends Table, T extends Table, N, NS>(
      mapping: SignedSessionValidityMapping<S, T, N, NS>
    ) =>
      signedSessionValidity(
        clockMapping(mapping) as unknown as NativeSignedSessionValidityMapping
      ).pipe(Effect.provideServiceEffect(NativeDatabase, nativeDatabase(databaseService))),
    coordinateSessionStepUp,
    makeSessionStepUpServices: <
      Claims,
      S extends Table,
      C extends Table,
      P extends Table,
      Session extends Table,
      T extends Table,
      N,
      NS,
      Id
    >(
      mapping: SessionStepUpMapping<NoInfer<Claims>, S, C, P, Session, T, N, NS>,
      target: Context.Service<Id, SessionStepUpPersistence<Claims>>
    ) =>
      sessionStepUpPersistence(
        clockMapping(mapping) as unknown as NativeSessionStepUpMapping<Claims>
      )
        .pipe(Effect.provideServiceEffect(NativeDatabase, nativeDatabase(databaseService)))
        .pipe(
          Effect.map((services) => ({
            sessionStepUpPersistence: target.of(services.sessionStepUpPersistence)
          }))
        ),
    makeSessionCleanupServices: Effect.fnUntraced(
      function*<P extends Table, T extends Table, N, NS>(mapping: SessionCleanupMapping<P, T, N, NS>) {
        const target = yield* nativeTarget(configuration)

        return yield* target.provide(
          makeNativeSessionCleanupServices(
            target.tables,
            clockMapping(mapping) as unknown as Parameters<
              typeof makeNativeSessionCleanupServices
            >[1]
          )
        )
      },
      Effect.provideServiceEffect(NativeDatabase, nativeDatabase(databaseService))
    )
  }
}
