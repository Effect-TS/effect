import type * as Effect from "effect/Effect"
import type * as HKT from "effect/HKT"
import type * as Schema from "effect/Schema"

import type { makeSessionModule } from "../sessions/module.ts"

export type ClaimsCodec = Schema.Codec<unknown, unknown, unknown, unknown>
export type AuthMethod = (...args: Array<never>) => Effect.Effect<unknown, unknown, unknown>

export interface BuiltStrategy {
  /** This method bundle completes authentication through the shared session authority. */
  readonly completion?: boolean
  readonly make: Effect.Effect<Readonly<Record<string, AuthMethod>>, unknown, unknown>
}

/** Static contracts and service keys shared by one auth definition. Implementations come from Layers. */
export interface StrategyBinding<
  Claims extends ClaimsCodec,
  Id extends string,
  SessionId extends string
> {
  readonly claims: Claims
  readonly namespace: Id
  readonly sessions: ReturnType<typeof makeSessionModule<SessionId, Claims>>
  readonly sessionNamespace: SessionId
}

export interface StrategyTypeLambda extends HKT.TypeLambda {
  readonly type: { readonly strategy: BuiltStrategy }
}

export type BindingOf<F extends HKT.TypeLambda> = Extract<
  F["Target"],
  {
    readonly claims: ClaimsCodec
    readonly namespace: string
    readonly sessionNamespace: string
  }
>

export interface StrategyDefinition<
  F extends StrategyTypeLambda,
  Namespace extends string | undefined = undefined
> {
  readonly _TypeLambda?: F
  /** Override only when an existing credential or operation namespace must be retained. */
  readonly namespace: Namespace
  readonly bind: <
    Claims extends ClaimsCodec,
    const Id extends string,
    const SessionId extends string
  >(
    binding: StrategyBinding<Claims, Id, SessionId>
  ) => HKT.Kind<F, never, never, never, StrategyBinding<Claims, Id, SessionId>>
}

export type StrategySelection = Readonly<
  Record<string, StrategyDefinition<StrategyTypeLambda, string | undefined> | BuiltStrategy>
>

type NamespaceOf<S, Root extends string, Key extends string> = S extends {
  readonly namespace: infer Id extends string | undefined
} ? undefined extends Id ? Exclude<Id, undefined> | `${Root}/${Key}`
  : Id
  : `${Root}/${Key}`

export type BoundStrategies<
  S extends StrategySelection,
  Claims extends ClaimsCodec,
  Id extends string,
  SessionId extends string
> = {
  readonly [K in keyof S]: S[K] extends StrategyDefinition<infer F, string | undefined> ? HKT.Kind<
      F,
      never,
      never,
      never,
      StrategyBinding<Claims, NamespaceOf<S[K], Id, Extract<K, string>>, SessionId>
    >
    : { readonly strategy: S[K] }
}

export type BoundSelection<S> = {
  readonly [K in keyof S]: S[K] extends { readonly strategy: infer Strategy extends BuiltStrategy } ? Strategy
    : never
}
