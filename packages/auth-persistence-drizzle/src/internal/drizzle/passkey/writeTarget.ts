import {
  makePasskeyNativeManagement,
  makePasskeyNativeRegistration,
  type NativePasskeyManagementMapping,
  type NativePasskeyRegistrationMapping
} from "@effect/auth-persistence/Adapter"
import { PasskeyManagementPersistence } from "@effect/auth/Passkey"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"

import type { NativeDatabaseHandle } from "../nativeDatabase.ts"
import type { PasskeyMappingSource } from "../passkeyModel.ts"
import type { PasskeyManagementServices, PasskeyRegistrationServices } from "../passkeyWriteModel.ts"
import { coordinatePasskeyOwner, makePasskeyMapped, type PasskeyTargetConfiguration } from "./target.ts"

export const passkeyManagementPersistenceLayer = <E, R>(
  services: Effect.Effect<PasskeyManagementServices, E, R>
) =>
  Layer.effect(
    PasskeyManagementPersistence,
    Effect.map(services, (value) => value.passkeyManagementPersistence)
  )

/** @internal */
export const makeTargetPasskeyManagement = Effect.fnUntraced(
  function*<M, R>(source: PasskeyMappingSource<M, R>, configuration: PasskeyTargetConfiguration) {
    const target = yield* makePasskeyMapped(source, configuration)
    const base = yield* target.base()

    return {
      passkeyPersistence: base.passkeyPersistence,
      ...makePasskeyNativeManagement(
        base,
        target.mapping as unknown as NativePasskeyManagementMapping
      )
    }
  }
)

/** @internal */
export const makeTargetPasskeyRegistrationWriter = Effect.fnUntraced(
  function*<M, Value, R>(source: PasskeyMappingSource<M, R>, configuration: PasskeyTargetConfiguration) {
    const target = yield* makePasskeyMapped(source, configuration)
    const base = yield* target.base()

    return {
      passkeyPersistence: base.passkeyPersistence,
      ...makePasskeyNativeRegistration(
        base,
        target.mapping as unknown as NativePasskeyRegistrationMapping<Value>
      )
    }
  }
)

/** @internal */
export const coordinateTargetPasskeyManagement = <M, RSetup, Transaction, A, E, R>(
  database: NativeDatabaseHandle,
  source: PasskeyMappingSource<M, RSetup>,
  configuration: PasskeyTargetConfiguration,
  body: (transaction: Transaction, services: PasskeyManagementServices) => Effect.Effect<A, E, R>
) =>
  coordinatePasskeyOwner(
    database,
    configuration,
    makeTargetPasskeyManagement(source, configuration),
    body
  )

/** @internal */
export const coordinateTargetPasskeyRegistrationWriter = <M, Value, RSetup, Transaction, A, E, R>(
  database: NativeDatabaseHandle,
  source: PasskeyMappingSource<M, RSetup>,
  configuration: PasskeyTargetConfiguration,
  body: (
    transaction: Transaction,
    services: PasskeyRegistrationServices<Value>
  ) => Effect.Effect<A, E, R>
) =>
  coordinatePasskeyOwner(
    database,
    configuration,
    makeTargetPasskeyRegistrationWriter<M, Value, RSetup>(source, configuration),
    body
  )
