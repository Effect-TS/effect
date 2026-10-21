import {
  type AnyProofPersistenceMapping as SharedMapping,
  makeNativeProofServices
} from "@effect/auth-persistence/Adapter"
import { ProofPersistence, ProofUnavailable } from "@effect/auth/Proofs"
import * as Cause from "effect/Cause"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"

import { nativeClock } from "./nativeClock.ts"
import type { NativeDatabaseHandle } from "./nativeDatabase.ts"
import { coordinateNativeTarget, nativeTarget, type NativeTargetConfiguration } from "./nativeTarget.ts"
import type { AnyProofPersistenceMapping } from "./proofModel.ts"
import { validateDrizzleStorage } from "./storageValidation.ts"

const unavailable = () => ProofUnavailable.make({})

/** @internal */
export const nativeProofMapping = (value: AnyProofPersistenceMapping): SharedMapping => ({
  ...value,
  clock: nativeClock(value.clock)
})

/** @internal */
export const makeTargetProofPersistenceServices = Effect.fnUntraced(function*(
  source: AnyProofPersistenceMapping,
  configuration: NativeTargetConfiguration
) {
  yield* validateDrizzleStorage(source).pipe(
    Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, unavailable)))
  )
  if (configuration.mode === "batch" && source.d1?.primary !== true) return yield* unavailable()
  const target = yield* nativeTarget(configuration)

  return yield* target.provide(makeNativeProofServices(target.tables, nativeProofMapping(source)))
})

/** @internal */
export const coordinateTargetProofPersistence = <Transaction, A, E, R>(
  database: NativeDatabaseHandle,
  source: AnyProofPersistenceMapping,
  configuration: NativeTargetConfiguration,
  body: (
    transaction: Transaction,
    services: { readonly proofPersistence: ProofPersistence["Service"] }
  ) => Effect.Effect<A, E, R>
) =>
  coordinateNativeTarget(
    unavailable,
    database,
    configuration,
    makeTargetProofPersistenceServices(source, configuration),
    body
  )

export const proofPersistenceLayer = <E, R>(
  services: Effect.Effect<{ readonly proofPersistence: ProofPersistence["Service"] }, E, R>
) =>
  Layer.effect(
    ProofPersistence,
    Effect.map(services, (value) => value.proofPersistence)
  )
