import * as Array from "effect/Array"
import * as Digest from "effect/crypto/Digest"
import * as SecureRandom from "effect/crypto/SecureRandom"
import * as Layer from "effect/Layer"

import { makeAuthStrategy } from "../auth/authStrategy.ts"
import { defaultLayer, hooksLayer } from "../auth/defaults.ts"
import type {
  BindingOf,
  ClaimsCodec,
  StrategyBinding,
  StrategyDefinition,
  StrategyTypeLambda
} from "../auth/definition.ts"
import type { OAuthAccountsPolicy } from "./accountsModels.ts"
import type { OAuthConnectedPolicy, OAuthConnectedProfile } from "./connectedModels.ts"
import type { OAuthProviderProfiles, ProfileOptions } from "./profiles.ts"
import type { OAuthRegistrationPolicy } from "./registrationModels.ts"
import { defaultOAuthSignInPolicy, type OAuthSignInPolicy } from "./signInModels.ts"
import { makeOAuthMethod } from "./signInModule.ts"

export type OAuthOptions<
  Namespace extends string | undefined = undefined,
  Access extends OAuthConnectedProfile | undefined = undefined,
  Profiles extends OAuthProviderProfiles = OAuthProviderProfiles
> = ProfileOptions<Profiles> & {
  readonly access?: Access
  readonly namespace?: Namespace
  readonly policy?: Partial<OAuthSignInPolicy>
}

export type OAuthRegistrationOptions<
  Registration extends ClaimsCodec,
  Namespace extends string | undefined = undefined,
  Profiles extends OAuthProviderProfiles = OAuthProviderProfiles,
  Authenticate extends boolean = false
> = OAuthOptions<Namespace, undefined, Profiles> & {
  readonly registration: Registration
  readonly registrationPolicy: OAuthRegistrationPolicy
  /** Authenticate only the first confirmed registration; replays remain metadata-only. */
  readonly authenticate?: Authenticate
}

const captureDefine = <
  const Namespace extends string | undefined,
  Access extends OAuthConnectedProfile | undefined,
  Profiles extends OAuthProviderProfiles
>(
  _namespace: Namespace,
  input: OAuthOptions<Namespace, Access, Profiles>
) => {
  const options: OAuthOptions<Namespace, Access, Profiles> & {
    readonly policy: OAuthSignInPolicy
  } = {
    ...input,
    ...(input.profiles === undefined ? {} : { profiles: Object.freeze({ ...input.profiles }) }),
    policy: Object.freeze({ ...defaultOAuthSignInPolicy, ...input.policy })
  }

  Object.freeze(options)

  return { options }
}

const bindSignIn = <
  const Namespace extends string | undefined,
  Claims extends ClaimsCodec,
  const Id extends string,
  const SessionId extends string,
  Access extends OAuthConnectedProfile | undefined,
  Profiles extends OAuthProviderProfiles
>(
  binding: StrategyBinding<Claims, Id, SessionId>,
  captured: ReturnType<typeof captureDefine<Namespace, Access, Profiles>>
) => {
  const { options } = captured

  const module = makeOAuthMethod<Id, SessionId, Claims, Access, Profiles>(binding.namespace, {
    ...options,
    sessions: binding.sessions
  })

  return Object.freeze({
    ...module,
    persistence: Object.freeze({
      kind: "oauth" as const,
      moduleId: binding.namespace,
      signIn: true as const
    }),
    strategy: makeAuthStrategy(
      {
        signIn: module.signIn,
        completeSignIn: module.operations.Complete.invoke
      },
      module.layer(options.policy).pipe(
        Layer.merge(
          Layer.merge(
            Layer.effect(SecureRandom.SecureRandom, SecureRandom.SecureRandom),
            Layer.effect(Digest.Digest, Digest.Digest)
          )
        )
      ),
      { completion: true }
    )
  })
}

const bindAccess = <
  const Namespace extends string | undefined,
  Claims extends ClaimsCodec,
  const Id extends string,
  const SessionId extends string,
  Profiles extends OAuthProviderProfiles
>(
  binding: StrategyBinding<Claims, Id, SessionId>,
  captured: ReturnType<typeof captureDefine<Namespace, OAuthConnectedProfile, Profiles>>,
  profile: OAuthConnectedProfile
) => {
  const base = bindSignIn<Namespace, Claims, Id, SessionId, OAuthConnectedProfile, Profiles>(
    binding,
    captured
  )

  const policy: OAuthConnectedPolicy = Object.freeze({
    ...captured.options.policy,
    profiles: Object.freeze([profile] as const),
    maximumEvidenceAgeMillis: 300_000,
    refreshClaimLifetimeMillis: captured.options.policy.exchangeTimeoutMillis
  })

  const access = base.connected(policy)

  const connectedLayer = access.handlersLayer.pipe(
    Layer.provide(defaultLayer(access.Connected, access.layer)),
    Layer.provide(defaultLayer(access.binding.RequestBinding, access.binding.layer)),
    Layer.provide(hooksLayer)
  )

  return Object.freeze({
    ...base,
    access,
    persistence: Object.freeze({ ...base.persistence, connected: policy }),
    strategy: makeAuthStrategy(
      {
        signIn: base.signIn,
        completeSignIn: base.operations.Complete.invoke,
        listAccountConnections: access.operations.List.invoke,
        disconnectAccount: access.operations.Disconnect.invoke
      },
      Layer.merge(base.layer(captured.options.policy), connectedLayer).pipe(
        Layer.merge(
          Layer.merge(
            Layer.effect(SecureRandom.SecureRandom, SecureRandom.SecureRandom),
            Layer.effect(Digest.Digest, Digest.Digest)
          )
        )
      ),
      { completion: true }
    )
  })
}

const bindDefine = <
  const Namespace extends string | undefined,
  Claims extends ClaimsCodec,
  const Id extends string,
  const SessionId extends string,
  Access extends OAuthConnectedProfile | undefined,
  Profiles extends OAuthProviderProfiles
>(
  binding: StrategyBinding<Claims, Id, SessionId>,
  captured: ReturnType<typeof captureDefine<Namespace, Access, Profiles>>
) => {
  // The conditional type follows the constructor's explicit capability selection.
  const result = captured.options.access === undefined
    ? bindSignIn<Namespace, Claims, Id, SessionId, Access, Profiles>(binding, captured)
    : bindAccess<Namespace, Claims, Id, SessionId, Profiles>(
      binding,
      { options: Object.assign({}, captured.options, { access: captured.options.access }) },
      captured.options.access
    )

  return result as Access extends OAuthConnectedProfile
    ? ReturnType<typeof bindAccess<Namespace, Claims, Id, SessionId, Profiles>>
    : ReturnType<typeof bindSignIn<Namespace, Claims, Id, SessionId, undefined, Profiles>>
}

export interface DefineStrategy<
  Namespace extends string | undefined,
  Access extends OAuthConnectedProfile | undefined = undefined,
  Profiles extends OAuthProviderProfiles = OAuthProviderProfiles
> extends StrategyTypeLambda {
  readonly type: ReturnType<
    typeof bindDefine<
      Namespace,
      BindingOf<this>["claims"],
      BindingOf<this>["namespace"],
      BindingOf<this>["sessionNamespace"],
      Access,
      Profiles
    >
  >
}

const define = <
  const Namespace extends string | undefined,
  Access extends OAuthConnectedProfile | undefined,
  Profiles extends OAuthProviderProfiles
>(
  namespace: Namespace,
  input: OAuthOptions<Namespace, Access, Profiles>
) => {
  const captured = captureDefine<Namespace, Access, Profiles>(namespace, input)

  const bind = <
    Claims extends ClaimsCodec,
    const Id extends string,
    const SessionId extends string
  >(
    binding: StrategyBinding<Claims, Id, SessionId>
  ) => bindDefine<Namespace, Claims, Id, SessionId, Access, Profiles>(binding, captured)

  const definition: StrategyDefinition<DefineStrategy<Namespace, Access, Profiles>, Namespace> = {
    namespace,
    bind
  }

  return Object.freeze(definition)
}

export function make<
  const Namespace extends string,
  Access extends OAuthConnectedProfile | undefined = undefined,
  Profiles extends OAuthProviderProfiles = OAuthProviderProfiles
>(
  options: OAuthOptions<Namespace, Access, Profiles> & { readonly namespace: Namespace }
): ReturnType<typeof define<Namespace, Access, Profiles>>

export function make<
  const Namespace extends string | undefined = undefined,
  Access extends OAuthConnectedProfile | undefined = undefined,
  Profiles extends OAuthProviderProfiles = OAuthProviderProfiles
>(
  options: OAuthOptions<Namespace, Access, Profiles>
): ReturnType<typeof define<Namespace | undefined, Access, Profiles>>

export function make<
  const Namespace extends string | undefined = undefined,
  Access extends OAuthConnectedProfile | undefined = undefined
>(
  options?: OAuthOptions<Namespace, Access>
): ReturnType<typeof define<Namespace | undefined, Access, OAuthProviderProfiles>>

export function make(
  options: OAuthOptions<string | undefined, OAuthConnectedProfile | undefined> = {}
) {
  return define(options.namespace, options)
}

const captureDefineRegistration = <
  Registration extends ClaimsCodec,
  const Namespace extends string | undefined = undefined,
  Profiles extends OAuthProviderProfiles = OAuthProviderProfiles,
  Authenticate extends boolean = false
>(
  _namespace: Namespace,
  input: OAuthRegistrationOptions<Registration, Namespace, Profiles, Authenticate>
) => {
  const options: OAuthRegistrationOptions<Registration, Namespace, Profiles, Authenticate> & {
    readonly policy: OAuthSignInPolicy
  } = Object.assign({}, input, {
    ...(input.profiles === undefined ? {} : { profiles: Object.freeze({ ...input.profiles }) }),
    policy: Object.freeze({ ...defaultOAuthSignInPolicy, ...input.policy }),
    registrationPolicy: Object.freeze({ ...input.registrationPolicy })
  })

  Object.freeze(options)

  return { options }
}

const bindDefineRegistration = <
  Registration extends ClaimsCodec,
  const Namespace extends string | undefined,
  Claims extends ClaimsCodec,
  const Id extends string,
  const SessionId extends string,
  Profiles extends OAuthProviderProfiles,
  Authenticate extends boolean
>(
  binding: StrategyBinding<Claims, Id, SessionId>,
  captured: ReturnType<
    typeof captureDefineRegistration<Registration, Namespace, Profiles, Authenticate>
  >
) => {
  const { options } = captured

  const module = makeOAuthMethod<Id, SessionId, Claims, undefined, Profiles>(binding.namespace, {
    ...options,
    sessions: binding.sessions
  })

  const registration = module.registration(options.registration, options)

  const layer = Layer.merge(module.handlersLayer, registration.handlersLayer).pipe(
    Layer.provide(
      Layer.merge(
        defaultLayer(
          module.SignIn,
          registration.signInLayer(options.policy, options.registrationPolicy)
        ),
        defaultLayer(registration.Registrations, registration.layer)
      )
    ),
    Layer.provide(defaultLayer(module.binding.RequestBinding, module.binding.layer)),
    Layer.provide(hooksLayer)
  )

  return Object.freeze({
    ...module,
    registration,
    strategy: makeAuthStrategy(
      {
        signIn: module.signIn,
        completeSignIn: module.operations.Complete.invoke,
        register: registration.operations.Complete.invoke
      },
      layer.pipe(
        Layer.merge(
          Layer.merge(
            Layer.effect(SecureRandom.SecureRandom, SecureRandom.SecureRandom),
            Layer.effect(Digest.Digest, Digest.Digest)
          )
        )
      ),
      { completion: true }
    )
  })
}

export interface DefineRegistrationStrategy<
  Registration extends ClaimsCodec,
  Namespace extends string | undefined = undefined,
  Profiles extends OAuthProviderProfiles = OAuthProviderProfiles,
  Authenticate extends boolean = false
> extends StrategyTypeLambda {
  readonly type: ReturnType<
    typeof bindDefineRegistration<
      Registration,
      Namespace,
      BindingOf<this>["claims"],
      BindingOf<this>["namespace"],
      BindingOf<this>["sessionNamespace"],
      Profiles,
      Authenticate
    >
  >
}

const defineRegistration = <
  Registration extends ClaimsCodec,
  const Namespace extends string | undefined = undefined,
  Profiles extends OAuthProviderProfiles = OAuthProviderProfiles,
  Authenticate extends boolean = false
>(
  namespace: Namespace,
  input: OAuthRegistrationOptions<Registration, Namespace, Profiles, Authenticate>
) => {
  const captured = captureDefineRegistration<Registration, Namespace, Profiles, Authenticate>(
    namespace,
    input
  )

  const bind = <
    Claims extends ClaimsCodec,
    const Id extends string,
    const SessionId extends string
  >(
    binding: StrategyBinding<Claims, Id, SessionId>
  ) =>
    bindDefineRegistration<Registration, Namespace, Claims, Id, SessionId, Profiles, Authenticate>(
      binding,
      captured
    )

  const definition: StrategyDefinition<
    DefineRegistrationStrategy<Registration, Namespace, Profiles, Authenticate>,
    Namespace
  > = {
    namespace,
    bind
  }

  return Object.freeze(definition)
}

export function makeRegistration<
  Registration extends ClaimsCodec,
  const Namespace extends string,
  Profiles extends OAuthProviderProfiles = OAuthProviderProfiles,
  Authenticate extends boolean = false
>(
  options: OAuthRegistrationOptions<Registration, Namespace, Profiles, Authenticate> & {
    readonly namespace: Namespace
  }
): ReturnType<typeof defineRegistration<Registration, Namespace, Profiles, Authenticate>>

export function makeRegistration<
  Registration extends ClaimsCodec,
  const Namespace extends string | undefined = undefined,
  Profiles extends OAuthProviderProfiles = OAuthProviderProfiles,
  Authenticate extends boolean = false
>(
  options: OAuthRegistrationOptions<Registration, Namespace, Profiles, Authenticate>
): ReturnType<
  typeof defineRegistration<Registration, Namespace | undefined, Profiles, Authenticate>
>

/** Registration selects the protocol's registration transition and its separate completion. */
export function makeRegistration<
  Registration extends ClaimsCodec,
  const Namespace extends string | undefined,
  Profiles extends OAuthProviderProfiles,
  Authenticate extends boolean
>(options: OAuthRegistrationOptions<Registration, Namespace, Profiles, Authenticate>) {
  return defineRegistration(options.namespace, options)
}

export interface OAuthAccountsOptions<Namespace extends string | undefined = undefined> {
  readonly namespace?: Namespace
  readonly policy: OAuthAccountsPolicy
}

const captureDefineAccounts = <const Namespace extends string | undefined>(
  _namespace: Namespace,
  input: OAuthAccountsOptions<Namespace>
) => {
  const options = Object.freeze({ ...input, policy: Object.freeze({ ...input.policy }) })

  return { options }
}

const bindDefineAccounts = <
  const Namespace extends string | undefined,
  Claims extends ClaimsCodec,
  const Id extends string,
  const SessionId extends string
>(
  binding: StrategyBinding<Claims, Id, SessionId>,
  captured: ReturnType<typeof captureDefineAccounts<Namespace>>
) => {
  const { options } = captured

  return makeOAuthMethod<Id, SessionId, Claims>(binding.namespace, {
    sessions: binding.sessions
  }).accounts(options.policy)
}

export interface DefineAccountsStrategy<
  Namespace extends string | undefined
> extends StrategyTypeLambda {
  readonly type: ReturnType<
    typeof bindDefineAccounts<
      Namespace,
      BindingOf<this>["claims"],
      BindingOf<this>["namespace"],
      BindingOf<this>["sessionNamespace"]
    >
  >
}

const defineAccounts = <const Namespace extends string | undefined>(
  namespace: Namespace,
  input: OAuthAccountsOptions<Namespace>
) => {
  const captured = captureDefineAccounts<Namespace>(namespace, input)

  const bind = <
    Claims extends ClaimsCodec,
    const Id extends string,
    const SessionId extends string
  >(
    binding: StrategyBinding<Claims, Id, SessionId>
  ) => bindDefineAccounts<Namespace, Claims, Id, SessionId>(binding, captured)

  const definition: StrategyDefinition<DefineAccountsStrategy<Namespace>, Namespace> = {
    namespace,
    bind
  }

  return Object.freeze(definition)
}

export function makeAccounts<const Namespace extends string>(
  options: OAuthAccountsOptions<Namespace> & { readonly namespace: Namespace }
): ReturnType<typeof defineAccounts<Namespace>>

export function makeAccounts<const Namespace extends string | undefined = undefined>(
  options: OAuthAccountsOptions<Namespace>
): ReturnType<typeof defineAccounts<Namespace | undefined>>

export function makeAccounts<const Namespace extends string | undefined>(
  options: OAuthAccountsOptions<Namespace>
) {
  return defineAccounts(options.namespace, options)
}

export interface OAuthConnectedOptions<Namespace extends string | undefined = undefined> {
  readonly namespace?: Namespace
  readonly policy: OAuthConnectedPolicy
}

const captureDefineConnected = <const Namespace extends string | undefined>(
  _namespace: Namespace,
  input: OAuthConnectedOptions<Namespace>
) => {
  const options = Object.freeze({
    ...input,
    policy: Object.freeze({
      ...input.policy,
      profiles: globalThis.Array.isArray(input.policy?.profiles)
        ? Object.freeze(
          Array.map(input.policy?.profiles, (profile) =>
            Object.freeze({
              ...profile,
              scopes: globalThis.Array.isArray(profile?.scopes)
                ? Object.freeze([...profile.scopes])
                : profile?.scopes,
              resources: globalThis.Array.isArray(profile?.resources)
                ? Object.freeze([...profile.resources])
                : profile?.resources
            }))
        )
        : input.policy?.profiles
    })
  })

  return { options }
}

const bindDefineConnected = <
  const Namespace extends string | undefined,
  Claims extends ClaimsCodec,
  const Id extends string,
  const SessionId extends string
>(
  binding: StrategyBinding<Claims, Id, SessionId>,
  captured: ReturnType<typeof captureDefineConnected<Namespace>>
) => {
  const { options } = captured

  const module = makeOAuthMethod<Id, SessionId, Claims>(binding.namespace, {
    sessions: binding.sessions
  }).connected(options.policy)

  return Object.freeze({
    ...module,
    persistence: Object.freeze({
      kind: "oauth" as const,
      moduleId: binding.namespace,
      signIn: false as const,
      connected: options.policy
    })
  })
}

export interface DefineConnectedStrategy<
  Namespace extends string | undefined
> extends StrategyTypeLambda {
  readonly type: ReturnType<
    typeof bindDefineConnected<
      Namespace,
      BindingOf<this>["claims"],
      BindingOf<this>["namespace"],
      BindingOf<this>["sessionNamespace"]
    >
  >
}

const defineConnected = <const Namespace extends string | undefined>(
  namespace: Namespace,
  input: OAuthConnectedOptions<Namespace>
) => {
  const captured = captureDefineConnected<Namespace>(namespace, input)

  const bind = <
    Claims extends ClaimsCodec,
    const Id extends string,
    const SessionId extends string
  >(
    binding: StrategyBinding<Claims, Id, SessionId>
  ) => bindDefineConnected<Namespace, Claims, Id, SessionId>(binding, captured)

  const definition: StrategyDefinition<DefineConnectedStrategy<Namespace>, Namespace> = {
    namespace,
    bind
  }

  return Object.freeze(definition)
}

export function makeConnected<const Namespace extends string>(
  options: OAuthConnectedOptions<Namespace> & { readonly namespace: Namespace }
): ReturnType<typeof defineConnected<Namespace>>

export function makeConnected<const Namespace extends string | undefined = undefined>(
  options: OAuthConnectedOptions<Namespace>
): ReturnType<typeof defineConnected<Namespace | undefined>>

export function makeConnected<const Namespace extends string | undefined>(
  options: OAuthConnectedOptions<Namespace>
) {
  return defineConnected(options.namespace, options)
}
