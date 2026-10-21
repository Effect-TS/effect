import type {
  BindingOf,
  ClaimsCodec,
  StrategyBinding,
  StrategyDefinition,
  StrategyTypeLambda
} from "../auth/definition.ts"
import type { TotpPolicy } from "./models.ts"
import { makeTotpModule } from "./module.ts"

export type TotpOptions<Namespace extends string | undefined = undefined> = Partial<TotpPolicy> & {
  readonly namespace?: Namespace
}

const captureDefine = <const Namespace extends string | undefined>(
  _namespace: Namespace,
  input: TotpOptions<Namespace>
) => {
  const options = Object.freeze({ ...defaults, ...input })

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

  return makeTotpModule(binding.namespace, options, binding.sessions)
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
  input: TotpOptions<Namespace>
) => {
  const captured = captureDefine<Namespace>(namespace, input)

  const bind = <
    Claims extends ClaimsCodec,
    const Id extends string,
    const SessionId extends string
  >(
    binding: StrategyBinding<Claims, Id, SessionId>
  ) => bindDefine<Namespace, Claims, Id, SessionId>(binding, captured)

  const definition: StrategyDefinition<DefineStrategy<Namespace>, Namespace> = { namespace, bind }

  return Object.freeze(definition)
}

export function make<const Namespace extends string>(
  options: TotpOptions<Namespace> & { readonly namespace: Namespace }
): ReturnType<typeof define<Namespace>>

export function make<const Namespace extends string | undefined = undefined>(
  options?: TotpOptions<Namespace>
): ReturnType<typeof define<Namespace | undefined>>

export function make<const Namespace extends string | undefined>(
  options: TotpOptions<Namespace> = {}
) {
  return define(options.namespace, options)
}

const defaults: TotpPolicy = {
  issuer: "Authentication",
  enrollmentLifetimeMillis: 300_000,
  revealLifetimeMillis: 60_000,
  clockSkewSteps: 1,
  attemptLimit: 5,
  attemptWindowMillis: 300_000,
  maximumEvidenceAgeMillis: 60_000,
  allowRecoveryCodeForPending: false,
  lostFactorRecovery: "deny",
  requireImmediateInvalidation: true
}
