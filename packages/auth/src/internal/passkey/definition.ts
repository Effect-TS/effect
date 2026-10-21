import type {
  BindingOf,
  ClaimsCodec,
  StrategyBinding,
  StrategyDefinition,
  StrategyTypeLambda
} from "../auth/definition.ts"
import { capturePasskeyConfiguration, makePasskeyMethod } from "./module.ts"
import type { PasskeyManagementPolicy } from "./policy.ts"

type MethodConfiguration<T> = T extends unknown ? Omit<T, "sessions"> : never

export type PasskeyOptions<Namespace extends string | undefined = undefined> =
  & MethodConfiguration<
    Parameters<typeof makePasskeyMethod>[1]
  >
  & { readonly namespace?: Namespace }

/** Behavior is static; host configuration, storage, claims and session completion are Layers. */
const captureDefine = <const Namespace extends string | undefined>(
  _namespace: Namespace,
  input: PasskeyOptions<Namespace>
) => {
  const options = Object.freeze({ ...input })
  const source = capturePasskeyConfiguration(options)

  return { options, source }
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
  const { options, source } = captured

  return makePasskeyMethod<Id, SessionId, Claims>(
    binding.namespace,
    {
      ...options,
      sessions: binding.sessions
    },
    source
  )
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
  input: PasskeyOptions<Namespace>
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

export function make<const Namespace extends string>(
  options: PasskeyOptions<Namespace> & { readonly namespace: Namespace }
): ReturnType<typeof define<Namespace>>

export function make<const Namespace extends string | undefined = undefined>(
  options?: PasskeyOptions<Namespace>
): ReturnType<typeof define<Namespace | undefined>>

export function make<const Namespace extends string | undefined>(
  options: PasskeyOptions<Namespace> = {}
) {
  return define(options.namespace, options)
}

export type PasskeyRegistrationConfiguration<
  Registration extends ClaimsCodec,
  Namespace extends string | undefined = undefined
> = PasskeyOptions<Namespace> & {
  readonly registration: Registration
}

export type PasskeyManagementOptions<Namespace extends string | undefined = undefined> = PasskeyOptions<Namespace> & {
  readonly management: PasskeyManagementPolicy
}

const captureDefineRegistration = <
  Registration extends ClaimsCodec,
  const Namespace extends string | undefined
>(
  _namespace: Namespace,
  input: PasskeyRegistrationConfiguration<Registration, Namespace>
) => {
  const options = Object.freeze({ ...input })
  const source = capturePasskeyConfiguration(options)

  return { options, source }
}

const bindDefineRegistration = <
  Registration extends ClaimsCodec,
  const Namespace extends string | undefined,
  Claims extends ClaimsCodec,
  const Id extends string,
  const SessionId extends string
>(
  binding: StrategyBinding<Claims, Id, SessionId>,
  captured: ReturnType<typeof captureDefineRegistration<Registration, Namespace>>
) => {
  const { options, source } = captured

  return makePasskeyMethod<Id, SessionId, Claims>(
    binding.namespace,
    {
      ...options,
      sessions: binding.sessions
    },
    source
  ).registration(options.registration)
}

export interface DefineRegistrationStrategy<
  Registration extends ClaimsCodec,
  Namespace extends string | undefined
> extends StrategyTypeLambda {
  readonly type: ReturnType<
    typeof bindDefineRegistration<
      Registration,
      Namespace,
      BindingOf<this>["claims"],
      BindingOf<this>["namespace"],
      BindingOf<this>["sessionNamespace"]
    >
  >
}

const defineRegistration = <
  Registration extends ClaimsCodec,
  const Namespace extends string | undefined
>(
  namespace: Namespace,
  input: PasskeyRegistrationConfiguration<Registration, Namespace>
) => {
  const captured = captureDefineRegistration<Registration, Namespace>(namespace, input)

  const bind = <
    Claims extends ClaimsCodec,
    const Id extends string,
    const SessionId extends string
  >(
    binding: StrategyBinding<Claims, Id, SessionId>
  ) => bindDefineRegistration<Registration, Namespace, Claims, Id, SessionId>(binding, captured)

  const definition: StrategyDefinition<
    DefineRegistrationStrategy<Registration, Namespace>,
    Namespace
  > = { namespace, bind }

  return Object.freeze(definition)
}

export function makeRegistration<Registration extends ClaimsCodec, const Namespace extends string>(
  options: PasskeyRegistrationConfiguration<Registration, Namespace> & {
    readonly namespace: Namespace
  }
): ReturnType<typeof defineRegistration<Registration, Namespace>>

export function makeRegistration<
  Registration extends ClaimsCodec,
  const Namespace extends string | undefined = undefined
>(
  options: PasskeyRegistrationConfiguration<Registration, Namespace>
): ReturnType<typeof defineRegistration<Registration, Namespace | undefined>>

export function makeRegistration<
  Registration extends ClaimsCodec,
  const Namespace extends string | undefined
>(options: PasskeyRegistrationConfiguration<Registration, Namespace>) {
  return defineRegistration(options.namespace, options)
}

const captureDefineManagement = <const Namespace extends string | undefined>(
  _namespace: Namespace,
  input: PasskeyManagementOptions<Namespace>
) => {
  const options = Object.freeze({ ...input, management: Object.freeze({ ...input.management }) })
  const source = capturePasskeyConfiguration(options)

  return { options, source }
}

const bindDefineManagement = <
  const Namespace extends string | undefined,
  Claims extends ClaimsCodec,
  const Id extends string,
  const SessionId extends string
>(
  binding: StrategyBinding<Claims, Id, SessionId>,
  captured: ReturnType<typeof captureDefineManagement<Namespace>>
) => {
  const { options, source } = captured

  return makePasskeyMethod<Id, SessionId, Claims>(
    binding.namespace,
    {
      ...options,
      sessions: binding.sessions
    },
    source
  ).management(options.management)
}

export interface DefineManagementStrategy<
  Namespace extends string | undefined
> extends StrategyTypeLambda {
  readonly type: ReturnType<
    typeof bindDefineManagement<
      Namespace,
      BindingOf<this>["claims"],
      BindingOf<this>["namespace"],
      BindingOf<this>["sessionNamespace"]
    >
  >
}

const defineManagement = <const Namespace extends string | undefined>(
  namespace: Namespace,
  input: PasskeyManagementOptions<Namespace>
) => {
  const captured = captureDefineManagement<Namespace>(namespace, input)

  const bind = <
    Claims extends ClaimsCodec,
    const Id extends string,
    const SessionId extends string
  >(
    binding: StrategyBinding<Claims, Id, SessionId>
  ) => bindDefineManagement<Namespace, Claims, Id, SessionId>(binding, captured)

  const definition: StrategyDefinition<DefineManagementStrategy<Namespace>, Namespace> = {
    namespace,
    bind
  }

  return Object.freeze(definition)
}

export function makeManagement<const Namespace extends string>(
  options: PasskeyManagementOptions<Namespace> & { readonly namespace: Namespace }
): ReturnType<typeof defineManagement<Namespace>>

export function makeManagement<const Namespace extends string | undefined = undefined>(
  options: PasskeyManagementOptions<Namespace>
): ReturnType<typeof defineManagement<Namespace | undefined>>

export function makeManagement<const Namespace extends string | undefined>(
  options: PasskeyManagementOptions<Namespace>
) {
  return defineManagement(options.namespace, options)
}

const captureDefineCompletion = <
  const Capability extends "pending" | "stepUp",
  const Namespace extends string | undefined
>(
  capability: Capability,
  _namespace: Namespace,
  input: PasskeyOptions<Namespace>
) => {
  const options = Object.freeze({ ...input })
  const source = capturePasskeyConfiguration(options)

  return { capability, options, source }
}

const bindDefineCompletion = <
  const Capability extends "pending" | "stepUp",
  const Namespace extends string | undefined,
  Claims extends ClaimsCodec,
  const Id extends string,
  const SessionId extends string
>(
  binding: StrategyBinding<Claims, Id, SessionId>,
  captured: ReturnType<typeof captureDefineCompletion<Capability, Namespace>>
) => {
  const { capability, options, source } = captured

  return makePasskeyMethod<Id, SessionId, Claims>(
    binding.namespace,
    {
      ...options,
      sessions: binding.sessions
    },
    source
  )[capability]
}

export interface DefineCompletionStrategy<
  Capability extends "pending" | "stepUp",
  Namespace extends string | undefined
> extends StrategyTypeLambda {
  readonly type: ReturnType<
    typeof bindDefineCompletion<
      Capability,
      Namespace,
      BindingOf<this>["claims"],
      BindingOf<this>["namespace"],
      BindingOf<this>["sessionNamespace"]
    >
  >
}

const defineCompletion = <
  const Capability extends "pending" | "stepUp",
  const Namespace extends string | undefined
>(
  capability: Capability,
  namespace: Namespace,
  input: PasskeyOptions<Namespace>
) => {
  const captured = captureDefineCompletion<Capability, Namespace>(capability, namespace, input)

  const bind = <
    Claims extends ClaimsCodec,
    const Id extends string,
    const SessionId extends string
  >(
    binding: StrategyBinding<Claims, Id, SessionId>
  ) => bindDefineCompletion<Capability, Namespace, Claims, Id, SessionId>(binding, captured)

  const definition: StrategyDefinition<
    DefineCompletionStrategy<Capability, Namespace>,
    Namespace
  > = { namespace, bind }

  return Object.freeze(definition)
}

export function makePending<const Namespace extends string>(
  options: PasskeyOptions<Namespace> & { readonly namespace: Namespace }
): ReturnType<typeof defineCompletion<"pending", Namespace>>

export function makePending<const Namespace extends string | undefined = undefined>(
  options?: PasskeyOptions<Namespace>
): ReturnType<typeof defineCompletion<"pending", Namespace | undefined>>

export function makePending<const Namespace extends string | undefined>(
  options: PasskeyOptions<Namespace> = {}
) {
  return defineCompletion("pending", options.namespace, options)
}

export function makeStepUp<const Namespace extends string>(
  options: PasskeyOptions<Namespace> & { readonly namespace: Namespace }
): ReturnType<typeof defineCompletion<"stepUp", Namespace>>

export function makeStepUp<const Namespace extends string | undefined = undefined>(
  options?: PasskeyOptions<Namespace>
): ReturnType<typeof defineCompletion<"stepUp", Namespace | undefined>>

export function makeStepUp<const Namespace extends string | undefined>(
  options: PasskeyOptions<Namespace> = {}
) {
  return defineCompletion("stepUp", options.namespace, options)
}
