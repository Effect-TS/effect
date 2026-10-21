import {
  captureOAuthMapping,
  makeNativeOAuthAccountsServices,
  makeNativeOAuthConnectedServices,
  makeNativeOAuthRegistrationIntentServices,
  makeNativeOAuthRegistrationServices,
  makeNativeOAuthRevocationServices,
  makeNativeOAuthSignInServices,
  type OAuthNativeAccountsMapping,
  type OAuthNativeConnectedMapping,
  type OAuthNativeReadMapping,
  type OAuthNativeRegistrationIntentMapping,
  type OAuthNativeRegistrationMapping,
  type OAuthNativeRevocationMapping
} from "@effect/auth-persistence/Adapter"
import type { LifecycleHooks } from "@effect/auth/Hooks"
import { OAuthUnavailable } from "@effect/auth/OAuth"
import { reportAuthDiagnostic } from "@effect/auth/Persistence"
import * as Cause from "effect/Cause"
import * as Effect from "effect/Effect"
import * as Predicate from "effect/Predicate"

import type { D1BatchStatements } from "./d1BatchStatements.ts"
import type { NativeDatabaseHandle } from "./nativeDatabase.ts"
import { coordinateNativeTarget, nativeTarget, type NativeTargetConfiguration } from "./nativeTarget.ts"
import { validateDrizzleStorage } from "./storageValidation.ts"

export {
  oauthAccountsPersistenceLayer,
  oauthConnectedPersistenceLayer,
  oauthConnectedRevocationsLayer,
  oauthRegistrationAuthorityLayer,
  oauthRegistrationIntentsLayer,
  oauthSignInPersistenceLayer
} from "@effect/auth-persistence/Adapter"

/** @internal */
export type OAuthTargetConfiguration = NativeTargetConfiguration

export type OAuthCoordinatorError<E> = E | OAuthUnavailable
const unavailable = () => OAuthUnavailable.make({})

const mapped = Effect.fnUntraced(function*(
  original: unknown,
  configuration: OAuthTargetConfiguration
) {
  const mapping = captureOAuthMapping(original)

  yield* validateDrizzleStorage(mapping).pipe(
    Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, unavailable)))
  )
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
    yield* reportAuthDiagnostic("persistence-validation", "configuration")

    return yield* unavailable()
  }

  return { mapping, ...(yield* nativeTarget(configuration)) }
})

/** @internal */
export const makeTargetOAuthSignInServices = Effect.fnUntraced(
  function*(source: unknown, configuration: OAuthTargetConfiguration) {
    const target = yield* mapped(source, configuration)

    return yield* target.provide(
      makeNativeOAuthSignInServices(
        target.tables,
        target.mapping as OAuthNativeReadMapping,
        target.batch
      )
    )
  }
)

/** @internal */
export const makeTargetOAuthAccountsServices = Effect.fnUntraced(
  function*(source: unknown, configuration: OAuthTargetConfiguration) {
    const target = yield* mapped(source, configuration)

    return yield* target.provide(
      makeNativeOAuthAccountsServices(
        target.tables,
        target.mapping as OAuthNativeAccountsMapping,
        target.batch
      )
    )
  }
)

/** @internal */
export const makeTargetOAuthRegistrationIntentServices = Effect.fnUntraced(
  function*(source: unknown, configuration: OAuthTargetConfiguration) {
    const target = yield* mapped(source, configuration)

    return yield* target.provide(
      makeNativeOAuthRegistrationIntentServices(
        target.tables,
        target.mapping as OAuthNativeRegistrationIntentMapping,
        target.batch
      )
    )
  }
)

/** @internal */
export const makeTargetOAuthConnectedServices = Effect.fnUntraced(
  function*(source: unknown, configuration: OAuthTargetConfiguration) {
    const target = yield* mapped(source, configuration)

    return yield* target.provide(
      makeNativeOAuthConnectedServices(
        target.tables,
        target.mapping as OAuthNativeConnectedMapping,
        target.batch
      )
    )
  }
)

/** @internal */
export const makeTargetOAuthConnectedRevocationServices = Effect.fnUntraced(
  function*(source: unknown, configuration: OAuthTargetConfiguration) {
    const target = yield* mapped(source, configuration)

    return yield* target.provide(
      makeNativeOAuthRevocationServices(
        target.tables,
        target.mapping as OAuthNativeRevocationMapping,
        target.batch
      )
    )
  }
)

/** @internal */
export const makeTargetOAuthRegistrationServices = Effect.fnUntraced(
  function*<Registration>(source: unknown, configuration: OAuthTargetConfiguration) {
    const target = yield* mapped(source, configuration)

    return yield* target.provide(
      makeNativeOAuthRegistrationServices(
        target.tables,
        target.mapping as OAuthNativeRegistrationMapping<Registration>,
        target.batch
      )
    )
  }
)

const coordinateOwner = <Services, Transaction, A, E, R, ES, RS>(
  database: NativeDatabaseHandle,
  configuration: OAuthTargetConfiguration,
  make: Effect.Effect<Services, ES, RS>,
  body: (transaction: Transaction, services: Services) => Effect.Effect<A, E, R>
): Effect.Effect<A, E | OAuthUnavailable, Exclude<R, D1BatchStatements> | RS | LifecycleHooks> =>
  coordinateNativeTarget(unavailable, database, configuration, make, body)

/** @internal */
export const coordinateTargetOAuthSignIn = <Transaction, A, E, R>(
  database: NativeDatabaseHandle,
  mapping: unknown,
  configuration: OAuthTargetConfiguration,
  body: (
    transaction: Transaction,
    services: Effect.Success<ReturnType<typeof makeTargetOAuthSignInServices>>
  ) => Effect.Effect<A, E, R>
) =>
  coordinateOwner(
    database,
    configuration,
    makeTargetOAuthSignInServices(mapping, configuration),
    body
  )

/** @internal */
export const coordinateTargetOAuthAccounts = <Transaction, A, E, R>(
  database: NativeDatabaseHandle,
  mapping: unknown,
  configuration: OAuthTargetConfiguration,
  body: (
    transaction: Transaction,
    services: Effect.Success<ReturnType<typeof makeTargetOAuthAccountsServices>>
  ) => Effect.Effect<A, E, R>
) =>
  coordinateOwner(
    database,
    configuration,
    makeTargetOAuthAccountsServices(mapping, configuration),
    body
  )

/** @internal */
export const coordinateTargetOAuthRegistrationIntents = <Transaction, A, E, R>(
  database: NativeDatabaseHandle,
  mapping: unknown,
  configuration: OAuthTargetConfiguration,
  body: (
    transaction: Transaction,
    services: Effect.Success<ReturnType<typeof makeTargetOAuthRegistrationIntentServices>>
  ) => Effect.Effect<A, E, R>
) =>
  coordinateOwner(
    database,
    configuration,
    makeTargetOAuthRegistrationIntentServices(mapping, configuration),
    body
  )

/** @internal */
export const coordinateTargetOAuthConnected = <Transaction, A, E, R>(
  database: NativeDatabaseHandle,
  mapping: unknown,
  configuration: OAuthTargetConfiguration,
  body: (
    transaction: Transaction,
    services: Effect.Success<ReturnType<typeof makeTargetOAuthConnectedServices>>
  ) => Effect.Effect<A, E, R>
) =>
  coordinateOwner(
    database,
    configuration,
    makeTargetOAuthConnectedServices(mapping, configuration),
    body
  )

/** @internal */
export const coordinateTargetOAuthConnectedRevocations = <Transaction, A, E, R>(
  database: NativeDatabaseHandle,
  mapping: unknown,
  configuration: OAuthTargetConfiguration,
  body: (
    transaction: Transaction,
    services: Effect.Success<ReturnType<typeof makeTargetOAuthConnectedRevocationServices>>
  ) => Effect.Effect<A, E, R>
) =>
  coordinateOwner(
    database,
    configuration,
    makeTargetOAuthConnectedRevocationServices(mapping, configuration),
    body
  )

/** @internal */
export const coordinateTargetOAuthRegistration = <Registration, Transaction, A, E, R>(
  database: NativeDatabaseHandle,
  mapping: unknown,
  configuration: OAuthTargetConfiguration,
  body: (
    transaction: Transaction,
    services: Effect.Success<ReturnType<typeof makeTargetOAuthRegistrationServices<Registration>>>
  ) => Effect.Effect<A, E, R>
) =>
  coordinateOwner(
    database,
    configuration,
    makeTargetOAuthRegistrationServices<Registration>(mapping, configuration),
    body
  )
