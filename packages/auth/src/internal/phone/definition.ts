import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"

import type {
  BindingOf,
  ClaimsCodec,
  StrategyBinding,
  StrategyDefinition,
  StrategyTypeLambda
} from "../auth/definition.ts"
import { operationGroup } from "../operations/operation.ts"
import { snapshotPhoneConfiguration } from "./configuration.ts"
import { makePhoneLifecycle } from "./lifecycle.ts"
import type { PhoneLifecyclePolicy } from "./lifecycleModels.ts"
import { makePhoneOtp } from "./module.ts"

export type PhoneOtpOptions<Namespace extends string | undefined = undefined> =
  & Omit<
    Parameters<typeof makePhoneOtp>[1],
    "sessions"
  >
  & { readonly namespace?: Namespace }

/** Bind the phone method to its Auth definition; runtime authorities come from Layers. */
const captureDefine = <const Namespace extends string | undefined>(
  _namespace: Namespace,
  input: PhoneOtpOptions<Namespace>
) => {
  const options = snapshotPhoneConfiguration(input)

  return { options }
}

const bindDefine = <
  const Namespace extends string | undefined,
  Claims extends ClaimsCodec,
  const Id extends string,
  const SessionId extends string
>(
  binding: StrategyBinding<Claims, Id, SessionId>,
  captured: ReturnType<typeof captureDefine<Namespace>>
) => {
  const { options } = captured

  return makePhoneOtp<Id, SessionId, Claims>(binding.namespace, {
    ...options,
    sessions: binding.sessions
  })
}

export interface DefineStrategy<Namespace extends string | undefined> extends StrategyTypeLambda {
  readonly type: ReturnType<
    typeof bindDefine<
      Namespace,
      BindingOf<this>["claims"],
      BindingOf<this>["namespace"],
      BindingOf<this>["sessionNamespace"]
    >
  >
}

const define = <const Namespace extends string | undefined>(
  namespace: Namespace,
  input: PhoneOtpOptions<Namespace>
) => {
  const captured = captureDefine<Namespace>(namespace, input)

  const bind = <
    Claims extends ClaimsCodec,
    const Id extends string,
    const SessionId extends string
  >(
    binding: StrategyBinding<Claims, Id, SessionId>
  ) => bindDefine<Namespace, Claims, Id, SessionId>(binding, captured)

  const definition: StrategyDefinition<DefineStrategy<Namespace>, Namespace> = {
    namespace,
    bind
  }

  return Object.freeze(definition)
}

/** Opt into phone registration, verification, and number changes. Delivery remains a Layer. */
export type PhoneLifecycleOptions<Namespace extends string | undefined = undefined> = PhoneOtpOptions<Namespace> & {
  readonly lifecycle: true | PhoneLifecyclePolicy
}

/** Bind the phone method to its Auth definition; runtime authorities come from Layers. */
const captureLifecycle = <const Namespace extends string | undefined>(
  _namespace: Namespace,
  input: PhoneLifecycleOptions<Namespace>
) => {
  const options = snapshotPhoneConfiguration({
    ...input,
    lifecycle: input.lifecycle === true ? (true as const) : Object.freeze({ ...input.lifecycle })
  })

  return { options }
}

const bindLifecycle = <
  const Namespace extends string | undefined,
  Claims extends ClaimsCodec,
  const Id extends string,
  const SessionId extends string
>(
  binding: StrategyBinding<Claims, Id, SessionId>,
  captured: ReturnType<typeof captureLifecycle<Namespace>>
) => {
  const { options } = captured

  const phone = makePhoneOtp<Id, SessionId, Claims>(binding.namespace, {
    ...options,
    sessions: binding.sessions
  })

  const { lifecycle: lifecyclePolicy, ...phoneOptions } = options

  const lifecycle = makePhoneLifecycle<Id, SessionId, Claims>(binding.namespace, {
    ...phoneOptions,
    ...(lifecyclePolicy === true ? {} : { lifecycle: lifecyclePolicy }),
    sessions: binding.sessions
  })

  return Object.freeze({
    ...phone,
    persistence: { ...phone.persistence, lifecycle: true as const },
    lifecycle,
    operations: { ...phone.operations, ...lifecycle.operations },
    group: operationGroup(
      phone.operations.SignIn,
      phone.operations.Complete,
      lifecycle.operations.Begin,
      lifecycle.operations.CompleteLifecycle,
      lifecycle.operations.Cancel
    ),
    layer: Layer.merge(phone.layer, lifecycle.layer),
    handlersLayer: Layer.merge(phone.handlersLayer, lifecycle.handlersLayer),
    strategy: {
      completion: true as const,
      make: Effect.gen(function*() {
        const signIn = yield* phone.strategy.make
        const management = yield* lifecycle.strategy.make

        return { ...signIn, ...management }
      })
    }
  })
}

export interface LifecycleStrategy<
  Namespace extends string | undefined
> extends StrategyTypeLambda {
  readonly type: ReturnType<
    typeof bindLifecycle<
      Namespace,
      BindingOf<this>["claims"],
      BindingOf<this>["namespace"],
      BindingOf<this>["sessionNamespace"]
    >
  >
}

const defineLifecycle = <const Namespace extends string | undefined>(
  namespace: Namespace,
  input: PhoneLifecycleOptions<Namespace>
) => {
  const captured = captureLifecycle<Namespace>(namespace, input)

  const bind = <
    Claims extends ClaimsCodec,
    const Id extends string,
    const SessionId extends string
  >(
    binding: StrategyBinding<Claims, Id, SessionId>
  ) => bindLifecycle<Namespace, Claims, Id, SessionId>(binding, captured)

  const definition: StrategyDefinition<LifecycleStrategy<Namespace>, Namespace> = {
    namespace,
    bind
  }

  return Object.freeze(definition)
}

/** Configure phone behavior; delivery, keys, and storage remain Layer dependencies. */
export function make<const Namespace extends string>(
  options: PhoneLifecycleOptions<Namespace> & { readonly namespace: Namespace }
): ReturnType<typeof defineLifecycle<Namespace>>

export function make<const Namespace extends string | undefined = undefined>(
  options: PhoneLifecycleOptions<Namespace>
): ReturnType<typeof defineLifecycle<Namespace | undefined>>

export function make<const Namespace extends string>(
  options: PhoneOtpOptions<Namespace> & { readonly namespace: Namespace }
): ReturnType<typeof define<Namespace>>

export function make<const Namespace extends string | undefined = undefined>(
  options?: PhoneOtpOptions<Namespace>
): ReturnType<typeof define<Namespace | undefined>>

export function make<const Namespace extends string | undefined>(
  options: PhoneOtpOptions<Namespace> | PhoneLifecycleOptions<Namespace> = {}
) {
  return "lifecycle" in options
    ? defineLifecycle(options.namespace, options)
    : define(options.namespace, options)
}
