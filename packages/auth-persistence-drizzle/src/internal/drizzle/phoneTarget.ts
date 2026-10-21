import { type AnyPhoneMapping as SharedMapping, makeNativePhoneServices } from "@effect/auth-persistence/Adapter"
import { PhoneConfigurationError, PhoneLifecyclePolicy, PhoneOtpUnavailable } from "@effect/auth/PhoneOtp"
import * as Cause from "effect/Cause"
import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"

import { NativeDatabase, type NativeDatabaseHandle } from "./nativeDatabase.ts"
import { coordinateNativeTarget, nativeTarget, type NativeTargetConfiguration } from "./nativeTarget.ts"
import type { AnyPhoneMapping, PhonePersistenceServices } from "./phoneModel.ts"
import { nativeProofMapping } from "./proofTarget.ts"
import { validateDrizzleStorage } from "./storageValidation.ts"

const unavailable = () => PhoneOtpUnavailable.make({})

const validate = Effect.fnUntraced(
  function*(source: AnyPhoneMapping, configuration: NativeTargetConfiguration) {
    yield* validateDrizzleStorage(source)
    yield* validateDrizzleStorage(source.proofs)
    yield* Schema.decodeEffect(PhoneLifecyclePolicy)(source.policy)
    if (configuration.mode === "batch" && source.proofs.d1?.primary !== true) {
      return yield* PhoneConfigurationError.make({})
    }
  },
  Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, () => PhoneConfigurationError.make({}))))
)

const services = Effect.fnUntraced(function*(
  source: AnyPhoneMapping,
  configuration: NativeTargetConfiguration
) {
  const target = yield* nativeTarget(configuration)
  const mapping: SharedMapping = { ...source, proofs: nativeProofMapping(source.proofs) }

  return yield* target.provide(makeNativePhoneServices(target.tables, mapping))
})

/** @internal */
export const makeTargetPhonePersistenceServices = (
  source: AnyPhoneMapping,
  configuration: NativeTargetConfiguration
) => validate(source, configuration).pipe(Effect.andThen(services(source, configuration)))

/** @internal */
export const coordinateTargetPhonePersistence = <Transaction, A, E, R>(
  database: NativeDatabaseHandle,
  source: AnyPhoneMapping,
  configuration: NativeTargetConfiguration,
  body: (transaction: Transaction, services: PhonePersistenceServices) => Effect.Effect<A, E, R>
) =>
  validate(source, configuration).pipe(
    Effect.provideService(NativeDatabase, database),
    Effect.andThen(
      coordinateNativeTarget(
        unavailable,
        database,
        configuration,
        services(source, configuration),
        body
      )
    )
  )
