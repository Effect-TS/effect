import type {
  BindingOf,
  ClaimsCodec,
  StrategyBinding,
  StrategyDefinition,
  StrategyTypeLambda
} from "../auth/definition.ts"
import { snapshotProofConfiguration } from "../proofs/module.ts"
import { defaultProofPolicy, type ProofPolicy } from "../proofs/policy.ts"
import type { EmailAddressPolicy } from "./addresses.ts"
import { type EmailProofOptions, makeEmailAccountModule, makeEmailSignInModule } from "./module.ts"

export interface EmailCodeOptions<Namespace extends string | undefined = undefined> {
  readonly namespace?: Namespace
  readonly policy?: ProofPolicy
  readonly digits?: 6 | 7 | 8 | 9 | 10
}

export interface EmailLinkOptions<Namespace extends string | undefined = undefined> {
  readonly namespace?: Namespace
  readonly policy?: ProofPolicy
  readonly url: string
}

const captureDefine = <
  const Mode extends "code" | "link",
  const Namespace extends string | undefined
>(
  mode: Mode,
  _namespace: Namespace,
  input: EmailProofOptions<Mode>
) => {
  const proof = snapshotProofConfiguration(input)

  return { mode, proof }
}

const bindDefine = <
  const Mode extends "code" | "link",
  const Namespace extends string | undefined,
  Claims extends ClaimsCodec,
  const Id extends string,
  const SessionId extends string
>(
  binding: StrategyBinding<Claims, Id, SessionId>,
  captured: ReturnType<typeof captureDefine<Mode, Namespace>>
) => {
  const { mode, proof } = captured

  return makeEmailSignInModule<Id, SessionId, Claims, Mode>(binding.namespace, {
    mode,
    proof,
    sessions: binding.sessions
  })
}

export interface DefineStrategy<
  Mode extends "code" | "link",
  Namespace extends string | undefined
> extends StrategyTypeLambda {
  readonly type: ReturnType<
    typeof bindDefine<
      Mode,
      Namespace,
      BindingOf<this>["claims"],
      BindingOf<this>["namespace"],
      BindingOf<this>["sessionNamespace"]
    >
  >
}

const define = <const Mode extends "code" | "link", const Namespace extends string | undefined>(
  mode: Mode,
  namespace: Namespace,
  input: EmailProofOptions<Mode>
) => {
  const captured = captureDefine<Mode, Namespace>(mode, namespace, input)

  const bind = <
    Claims extends ClaimsCodec,
    const Id extends string,
    const SessionId extends string
  >(
    binding: StrategyBinding<Claims, Id, SessionId>
  ) => bindDefine<Mode, Namespace, Claims, Id, SessionId>(binding, captured)

  const definition: StrategyDefinition<DefineStrategy<Mode, Namespace>, Namespace> = {
    namespace,
    bind
  }

  return Object.freeze(definition)
}

export function makeCode<const Namespace extends string>(
  options: EmailCodeOptions<Namespace> & { readonly namespace: Namespace }
): ReturnType<typeof define<"code", Namespace>>

export function makeCode<const Namespace extends string | undefined = undefined>(
  options?: EmailCodeOptions<Namespace>
): ReturnType<typeof define<"code", Namespace | undefined>>

export function makeCode<const Namespace extends string | undefined>(
  options: EmailCodeOptions<Namespace> = {}
) {
  return define("code", options.namespace, {
    ...options,
    policy: options.policy ?? defaultProofPolicy,
    secret: { _tag: "NumericCode", digits: options.digits ?? 6 }
  })
}

export function makeLink<const Namespace extends string>(
  options: EmailLinkOptions<Namespace> & { readonly namespace: Namespace }
): ReturnType<typeof define<"link", Namespace>>

export function makeLink<const Namespace extends string | undefined = undefined>(
  options: EmailLinkOptions<Namespace>
): ReturnType<typeof define<"link", Namespace | undefined>>

export function makeLink<const Namespace extends string | undefined>(
  options: EmailLinkOptions<Namespace>
) {
  return define("link", options.namespace, {
    ...options,
    policy: options.policy ?? defaultProofPolicy,
    secret: { _tag: "Token" }
  })
}

export interface EmailRegistrationOptions<
  Registration extends ClaimsCodec,
  Namespace extends string | undefined = undefined
> extends EmailCodeOptions<Namespace> {
  readonly registration: Registration
}

export interface EmailAddressOptions<
  Namespace extends string | undefined = undefined
> extends EmailCodeOptions<Namespace> {
  readonly addresses: EmailAddressPolicy
}

const captureDefineRegistration = <
  Registration extends ClaimsCodec,
  const Namespace extends string | undefined
>(
  _namespace: Namespace,
  input: EmailRegistrationOptions<Registration, Namespace>
) => {
  const options = snapshotProofConfiguration({
    ...input,
    policy: input.policy ?? defaultProofPolicy,
    secret: { _tag: "NumericCode" as const, digits: input.digits ?? 6 }
  })

  return { options }
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
  const { options } = captured

  return makeEmailAccountModule<Id, SessionId, Claims>(binding.namespace, {
    sessions: binding.sessions,
    code: { ...options, secret: { _tag: "NumericCode", digits: options.digits ?? 6 } }
  }).registration(options.registration)
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
  input: EmailRegistrationOptions<Registration, Namespace>
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
  options: EmailRegistrationOptions<Registration, Namespace> & { readonly namespace: Namespace }
): ReturnType<typeof defineRegistration<Registration, Namespace>>

export function makeRegistration<
  Registration extends ClaimsCodec,
  const Namespace extends string | undefined = undefined
>(
  options: EmailRegistrationOptions<Registration, Namespace>
): ReturnType<typeof defineRegistration<Registration, Namespace | undefined>>

export function makeRegistration<
  Registration extends ClaimsCodec,
  const Namespace extends string | undefined
>(options: EmailRegistrationOptions<Registration, Namespace>) {
  return defineRegistration(options.namespace, options)
}

const captureDefineAddresses = <const Namespace extends string | undefined>(
  _namespace: Namespace,
  input: EmailAddressOptions<Namespace>
) => {
  const options = snapshotProofConfiguration({
    ...input,
    policy: input.policy ?? defaultProofPolicy,
    addresses: Object.freeze({ ...input.addresses }),
    secret: { _tag: "NumericCode" as const, digits: input.digits ?? 6 }
  })

  return { options }
}

const bindDefineAddresses = <
  const Namespace extends string | undefined,
  Claims extends ClaimsCodec,
  const Id extends string,
  const SessionId extends string
>(
  binding: StrategyBinding<Claims, Id, SessionId>,
  captured: ReturnType<typeof captureDefineAddresses<Namespace>>
) => {
  const { options } = captured

  return makeEmailAccountModule<Id, SessionId, Claims>(binding.namespace, {
    sessions: binding.sessions,
    code: { ...options, secret: { _tag: "NumericCode", digits: options.digits ?? 6 } }
  }).addresses(options.addresses)
}

export interface DefineAddressesStrategy<
  Namespace extends string | undefined
> extends StrategyTypeLambda {
  readonly type: ReturnType<
    typeof bindDefineAddresses<
      Namespace,
      BindingOf<this>["claims"],
      BindingOf<this>["namespace"],
      BindingOf<this>["sessionNamespace"]
    >
  >
}

const defineAddresses = <const Namespace extends string | undefined>(
  namespace: Namespace,
  input: EmailAddressOptions<Namespace>
) => {
  const captured = captureDefineAddresses<Namespace>(namespace, input)

  const bind = <
    Claims extends ClaimsCodec,
    const Id extends string,
    const SessionId extends string
  >(
    binding: StrategyBinding<Claims, Id, SessionId>
  ) => bindDefineAddresses<Namespace, Claims, Id, SessionId>(binding, captured)

  const definition: StrategyDefinition<DefineAddressesStrategy<Namespace>, Namespace> = {
    namespace,
    bind
  }

  return Object.freeze(definition)
}

export function makeAddresses<const Namespace extends string>(
  options: EmailAddressOptions<Namespace> & { readonly namespace: Namespace }
): ReturnType<typeof defineAddresses<Namespace>>

export function makeAddresses<const Namespace extends string | undefined = undefined>(
  options: EmailAddressOptions<Namespace>
): ReturnType<typeof defineAddresses<Namespace | undefined>>

export function makeAddresses<const Namespace extends string | undefined>(
  options: EmailAddressOptions<Namespace>
) {
  return defineAddresses(options.namespace, options)
}
