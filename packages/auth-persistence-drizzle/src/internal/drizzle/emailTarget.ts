import {
  type AnyEmailAddressMapping as SharedEmailMapping,
  type EmailRegistrationAuthority,
  makeNativeEmailAddressServices,
  makeNativeEmailRegistrationServices,
  makeNativeEmailSignInServices
} from "@effect/auth-persistence/Adapter"
import { EmailAddressPersistence, EmailSignInTargets, EmailUnavailable } from "@effect/auth/Email"
import * as Cause from "effect/Cause"
import type * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"

import type { AnyEmailAddressMapping, AnyEmailRegistrationMapping, AnyEmailSignInMapping } from "./emailModel.ts"
import { nativeClock } from "./nativeClock.ts"
import type { NativeDatabaseHandle } from "./nativeDatabase.ts"
import { coordinateNativeTarget, nativeTarget, type NativeTargetConfiguration } from "./nativeTarget.ts"
import type { AnyProofPersistenceMapping } from "./proofModel.ts"
import { nativeProofMapping } from "./proofTarget.ts"
import { validateDrizzleStorage } from "./storageValidation.ts"

const unavailable = () => EmailUnavailable.make({})

const mapped = (value: AnyEmailAddressMapping): SharedEmailMapping => ({
  ...value,
  clock: nativeClock(value.clock)
})

/** @internal */
export const makeTargetEmailAddressServices = Effect.fnUntraced(function*(
  mapping: AnyEmailAddressMapping,
  configuration: NativeTargetConfiguration,
  proofs?: AnyProofPersistenceMapping
) {
  yield* validateDrizzleStorage(mapping).pipe(
    Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, unavailable)))
  )
  if (proofs !== undefined) {
    yield* validateDrizzleStorage(proofs).pipe(
      Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, unavailable)))
    )
  }
  if (
    configuration.mode === "batch" &&
    (mapping.d1?.primary !== true || (proofs !== undefined && proofs.d1?.primary !== true))
  ) {
    return yield* unavailable()
  }
  const target = yield* nativeTarget(configuration)

  return yield* target.provide(
    makeNativeEmailAddressServices(
      target.tables,
      mapped(mapping),
      proofs === undefined ? undefined : nativeProofMapping(proofs)
    )
  )
})

/** @internal */
export const makeTargetEmailRegistrationServices = Effect.fnUntraced(function*<Registration>(
  mapping: AnyEmailRegistrationMapping<Registration>,
  configuration: NativeTargetConfiguration,
  proofs: AnyProofPersistenceMapping
) {
  yield* validateDrizzleStorage(mapping).pipe(
    Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, unavailable)))
  )
  yield* validateDrizzleStorage(proofs).pipe(
    Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, unavailable)))
  )
  if (
    configuration.mode === "batch" &&
    (mapping.d1?.primary !== true || proofs.d1?.primary !== true)
  ) {
    return yield* unavailable()
  }
  const target = yield* nativeTarget(configuration)

  return yield* target.provide(
    makeNativeEmailRegistrationServices(
      target.tables,
      {
        ...mapping,
        clock: nativeClock(mapping.clock)
      },
      nativeProofMapping(proofs),
      target.batch
    )
  )
})

/** @internal */
export const coordinateTargetEmailAddress = <Transaction, A, E, R>(
  database: NativeDatabaseHandle,
  mapping: AnyEmailAddressMapping,
  configuration: NativeTargetConfiguration,
  body: (
    transaction: Transaction,
    services: { readonly emailAddressPersistence: EmailAddressPersistence["Service"] }
  ) => Effect.Effect<A, E, R>,
  proofs?: AnyProofPersistenceMapping
) =>
  coordinateNativeTarget(
    unavailable,
    database,
    configuration,
    makeTargetEmailAddressServices(mapping, configuration, proofs),
    body
  )

/** @internal */
export const coordinateTargetEmailRegistration = <Registration, Transaction, A, E, R>(
  database: NativeDatabaseHandle,
  mapping: AnyEmailRegistrationMapping<Registration>,
  configuration: NativeTargetConfiguration,
  proofs: AnyProofPersistenceMapping,
  body: (
    transaction: Transaction,
    services: { readonly registrationAuthority: EmailRegistrationAuthority<Registration> }
  ) => Effect.Effect<A, E, R>
) =>
  coordinateNativeTarget(
    unavailable,
    database,
    configuration,
    makeTargetEmailRegistrationServices(mapping, configuration, proofs),
    body
  )

export const emailAddressPersistenceLayer = <E, R>(
  services: Effect.Effect<
    { readonly emailAddressPersistence: EmailAddressPersistence["Service"] },
    E,
    R
  >
) =>
  Layer.effect(
    EmailAddressPersistence,
    Effect.map(services, (value) => value.emailAddressPersistence)
  )

export const emailRegistrationLayer = <Id, Registration, E, R>(
  target: Context.Key<Id, EmailRegistrationAuthority<Registration>>,
  services: Effect.Effect<
    { readonly registrationAuthority: EmailRegistrationAuthority<Registration> },
    E,
    R
  >
) =>
  Layer.effect(
    target,
    Effect.map(services, (value) => value.registrationAuthority)
  )

/** @internal */
export const makeTargetEmailSignInServices = Effect.fnUntraced(function*(
  mapping: AnyEmailSignInMapping,
  configuration: NativeTargetConfiguration
) {
  yield* validateDrizzleStorage(mapping).pipe(
    Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, unavailable)))
  )
  const target = yield* nativeTarget(configuration)

  return yield* target.provide(makeNativeEmailSignInServices(target.tables, mapping))
})

export const emailSignInTargetsLayer = <E, R>(
  services: Effect.Effect<{ readonly emailSignInTargets: EmailSignInTargets["Service"] }, E, R>
) =>
  Layer.effect(
    EmailSignInTargets,
    Effect.map(services, (value) => value.emailSignInTargets)
  )
