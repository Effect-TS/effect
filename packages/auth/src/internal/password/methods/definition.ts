import type {
  BindingOf,
  ClaimsCodec,
  StrategyBinding,
  StrategyDefinition,
  StrategyTypeLambda
} from "../../auth/definition.ts"
import type { ProofSecretPolicy } from "../../proofs/crypto.ts"
import { snapshotProofConfiguration } from "../../proofs/module.ts"
import { defaultProofPolicy, type ProofPolicy } from "../../proofs/policy.ts"
import { makePasswordMethod } from "./module.ts"
import { defaultPasswordMethodPolicy, type PasswordMethodPolicy, snapshotPasswordMethodPolicy } from "./policy.ts"
import { makePasswordSignIn } from "./signIn.ts"

export interface PasswordOptions<Namespace extends string | undefined = undefined> {
  readonly namespace?: Namespace
  readonly policy?: PasswordMethodPolicy
}

export interface PasswordManagementOptions<
  Registration extends ClaimsCodec,
  Namespace extends string | undefined = undefined,
  Secret extends ProofSecretPolicy = ProofSecretPolicy
> extends PasswordOptions<Namespace> {
  readonly registration: Registration
  readonly reset: {
    readonly secret: Secret
    readonly url?: string
    readonly policy?: ProofPolicy
  }
}

const captureSignIn = <const Namespace extends string | undefined = undefined>(
  _namespace: Namespace,
  input: PasswordOptions<Namespace>
) => {
  const options = Object.freeze({
    ...input,
    ...(input.policy === undefined ? {} : { policy: snapshotPasswordMethodPolicy(input.policy) })
  })

  return { options }
}

const bindSignIn = <
  const Namespace extends string | undefined,
  Claims extends ClaimsCodec,
  const Id extends string,
  const SessionId extends string
>(
  binding: StrategyBinding<Claims, Id, SessionId>,
  captured: ReturnType<typeof captureSignIn<Namespace>>
) => {
  const { options } = captured

  return makePasswordSignIn<Id, SessionId, Claims>(binding.namespace, {
    ...options,
    sessions: binding.sessions
  })
}

export interface SignInStrategy<
  Namespace extends string | undefined = undefined
> extends StrategyTypeLambda {
  readonly type: ReturnType<
    typeof bindSignIn<
      Namespace,
      BindingOf<this>["claims"],
      BindingOf<this>["namespace"],
      BindingOf<this>["sessionNamespace"]
    >
  >
}

const signIn = <const Namespace extends string | undefined = undefined>(
  namespace: Namespace,
  input: PasswordOptions<Namespace>
) => {
  const captured = captureSignIn<Namespace>(namespace, input)

  const bind = <
    Claims extends ClaimsCodec,
    const Id extends string,
    const SessionId extends string
  >(
    binding: StrategyBinding<Claims, Id, SessionId>
  ) => bindSignIn<Namespace, Claims, Id, SessionId>(binding, captured)

  const definition: StrategyDefinition<SignInStrategy<Namespace>, Namespace> = {
    namespace,
    bind
  }

  return Object.freeze(definition)
}

const captureManagement = <
  Registration extends ClaimsCodec,
  const Namespace extends string | undefined = undefined,
  const Secret extends ProofSecretPolicy = { readonly _tag: "Token" }
>(
  _namespace: Namespace,
  input: PasswordManagementOptions<Registration, Namespace, Secret>
) => {
  const options = Object.freeze({
    ...input,
    policy: snapshotPasswordMethodPolicy(input.policy ?? defaultPasswordMethodPolicy),
    reset: snapshotProofConfiguration({
      secret: input.reset.secret,
      ...(input.reset.url === undefined ? {} : { url: input.reset.url }),
      policy: input.reset.policy ?? defaultProofPolicy
    })
  })

  return { options }
}

const bindManagement = <
  Registration extends ClaimsCodec,
  const Namespace extends string | undefined,
  Claims extends ClaimsCodec,
  const Id extends string,
  const SessionId extends string,
  const Secret extends ProofSecretPolicy
>(
  binding: StrategyBinding<Claims, Id, SessionId>,
  captured: ReturnType<typeof captureManagement<Registration, Namespace, Secret>>
) => {
  const { options } = captured

  return makePasswordMethod<Id, SessionId, Claims, Registration, Secret>(binding.namespace, {
    ...options,
    sessions: binding.sessions
  })
}

export interface ManagementStrategy<
  Registration extends ClaimsCodec,
  Namespace extends string | undefined = undefined,
  Secret extends ProofSecretPolicy = { readonly _tag: "Token" }
> extends StrategyTypeLambda {
  readonly type: ReturnType<
    typeof bindManagement<
      Registration,
      Namespace,
      BindingOf<this>["claims"],
      BindingOf<this>["namespace"],
      BindingOf<this>["sessionNamespace"],
      Secret
    >
  >
}

const management = <
  Registration extends ClaimsCodec,
  const Namespace extends string | undefined = undefined,
  const Secret extends ProofSecretPolicy = { readonly _tag: "Token" }
>(
  namespace: Namespace,
  input: PasswordManagementOptions<Registration, Namespace, Secret>
) => {
  const captured = captureManagement<Registration, Namespace, Secret>(namespace, input)

  const bind = <
    Claims extends ClaimsCodec,
    const Id extends string,
    const SessionId extends string
  >(
    binding: StrategyBinding<Claims, Id, SessionId>
  ) => bindManagement<Registration, Namespace, Claims, Id, SessionId, Secret>(binding, captured)

  const definition: StrategyDefinition<
    ManagementStrategy<Registration, Namespace, Secret>,
    Namespace
  > = {
    namespace,
    bind
  }

  return Object.freeze(definition)
}

export function make<
  Registration extends ClaimsCodec,
  const Namespace extends string,
  const Secret extends ProofSecretPolicy = { readonly _tag: "Token" }
>(
  options: PasswordManagementOptions<Registration, Namespace, Secret> & {
    readonly namespace: Namespace
  }
): ReturnType<typeof management<Registration, Namespace, Secret>>

export function make<
  Registration extends ClaimsCodec,
  const Namespace extends string | undefined = undefined,
  const Secret extends ProofSecretPolicy = { readonly _tag: "Token" }
>(
  options: PasswordManagementOptions<Registration, Namespace, Secret>
): ReturnType<typeof management<Registration, Namespace | undefined, Secret>>

export function make<const Namespace extends string>(
  options: PasswordOptions<Namespace> & { readonly namespace: Namespace }
): ReturnType<typeof signIn<Namespace>>

export function make<const Namespace extends string | undefined = undefined>(
  options?: PasswordOptions<Namespace>
): ReturnType<typeof signIn<Namespace | undefined>>

/** Existing-account sign-in is the default; registration and password changes are explicit. */
export function make<
  Registration extends ClaimsCodec,
  const Namespace extends string | undefined = undefined,
  const Secret extends ProofSecretPolicy = { readonly _tag: "Token" }
>(
  options:
    | PasswordOptions<Namespace>
    | PasswordManagementOptions<Registration, Namespace, Secret> = {}
) {
  return "registration" in options
    ? management(options.namespace, options)
    : signIn(options.namespace, options)
}

/** Configure token proofs and their fixed HTTPS landing page together. */
export const resetLink = (options: { readonly url: string; readonly policy?: ProofPolicy }) => ({
  secret: { _tag: "Token" as const },
  url: options.url,
  ...(options.policy === undefined ? {} : { policy: options.policy })
})

/** Numeric reset codes preserve leading zeroes and require ProofKeys. */
export const resetCode = (
  options: {
    readonly digits?: 6 | 7 | 8 | 9 | 10
    readonly policy?: ProofPolicy
  } = {}
) => ({
  secret: { _tag: "NumericCode" as const, digits: options.digits ?? 6 },
  ...(options.policy === undefined ? {} : { policy: options.policy })
})
