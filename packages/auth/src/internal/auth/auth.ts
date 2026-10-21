import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as Schema from "effect/Schema"
import * as Scope from "effect/Scope"
import type * as Types from "effect/Types"

import { type AnyAuthContract, make as makeContract, sessionContractFor } from "../operations/actions.ts"
import type { AuthenticationAuthority } from "../sessions/authenticationAuthority.ts"
import { configuredLayer, type SessionConfiguration, type SessionRequirements } from "../sessions/configuration.ts"
import type { SessionConfigurationError } from "../sessions/errors.ts"
import { makeSessionModule, type ModuleService } from "../sessions/module.ts"
import { makeActionApi } from "./actions.ts"
import { AuthConfigurationError } from "./authConfigurationError.ts"
import { hooksLayer } from "./defaults.ts"
import type {
  BoundSelection,
  BoundStrategies,
  BuiltStrategy as Strategy,
  ClaimsCodec,
  StrategySelection
} from "./definition.ts"
import { makeSessionApi } from "./session.ts"

type Strategies = Readonly<Record<string, Strategy>>
type CompletionOf<S> = S extends { readonly completion: infer C } ? C : false

const withConstructionLayer = Effect.fnUntraced(
  function*<A, E, R, Provided, E2, R2>(create: Effect.Effect<A, E, R>, layer: Layer.Layer<Provided, E2, R2>) {
    const current = yield* Effect.serviceOption(Layer.CurrentMemoMap)
    const memoMap = Option.isSome(current) ? current.value : yield* Layer.makeMemoMap
    const scope = yield* Scope.fork(yield* Effect.scope)

    return yield* Effect.gen(function*() {
      const services = yield* Layer.buildWithMemoMap(layer, memoMap, scope)

      return yield* create.pipe(
        Effect.provide(services),
        Scope.provide(scope),
        Effect.provideService(Layer.CurrentMemoMap, memoMap)
      )
    }).pipe(Effect.onError((cause) => Scope.close(scope, Exit.failCause(cause))))
  }
)

type Api<S extends Strategy> = Effect.Success<S["make"]>
type StrategyMethod<S extends Strategy> = S extends Strategy ? Api<S>[keyof Api<S>] : never
type MethodNames<S extends Strategies> = S[keyof S] extends infer Strategy
  ? Strategy extends { readonly make: Effect.Effect<infer Api, unknown, unknown> } ? keyof Api
  : never
  : never
type Selected<S extends Strategies, M extends PropertyKey> = {
  [K in keyof S]: M extends keyof Api<S[K]>
    ? (strategy: K, input: Parameters<Api<S[K]>[M]>[0]) => ReturnType<Api<S[K]>[M]>
    : never
}[keyof S]

export type AuthApi<S extends Strategies, Default extends keyof S | undefined> = {
  readonly [M in MethodNames<S>]:
    & Types.UnionToIntersection<Selected<S, M>>
    & (Default extends keyof S ? M extends keyof Api<S[Default]> ? Api<S[Default]>[M]
      : unknown
      : unknown)
}

type DefaultedName<Key extends string, Value extends string, Default extends string> = [
  Value,
  Default
] extends [Default, Value] ? { readonly [K in Key]?: Value }
  : { readonly [K in Key]: Value }

type Names<Id extends string, SessionId extends string, Default extends string> =
  & DefaultedName<
    "namespace",
    Id,
    Default
  >
  & DefaultedName<"sessionNamespace", SessionId, `${Id}/sessions`>

export type Options<
  Claims extends ClaimsCodec,
  S extends StrategySelection,
  Default extends keyof S | undefined = undefined,
  Id extends string = "effect-auth",
  SessionId extends string = `${Id}/sessions`,
  DefaultId extends string = "effect-auth",
  Sessions extends SessionConfiguration | undefined = undefined
> = {
  readonly claims: Claims
  readonly strategies?: S & Record<Exclude<keyof S, string>, never>
  /** Omit when supplying a custom SessionStrategy and completion through Layers. */
  readonly sessions?: Sessions
  readonly defaultStrategy?: Default
} & Names<Id, SessionId, DefaultId>

const build = Effect.fn("Auth.make")(function*<
  S extends Strategies,
  Default extends keyof S | undefined
>(strategies: S, defaultStrategy: Default | undefined) {
  type Build = S[keyof S]["make"]

  const entries = Object.entries(strategies) as Array<
    [
      string,
      {
        readonly make: Effect.Effect<
          Effect.Success<Build>,
          Effect.Error<Build>,
          Effect.Services<Build>
        >
      }
    ]
  >

  const current = yield* Effect.serviceOption(Layer.CurrentMemoMap)
  const memoMap = Option.isSome(current) ? current.value : yield* Layer.makeMemoMap
  const scope = yield* Scope.fork(yield* Effect.scope)

  return yield* Effect.gen(function*() {
    type Result = ReturnType<StrategyMethod<S[keyof S]>>
    type Callable = (
      input: never
    ) => Effect.Effect<Effect.Success<Result>, Effect.Error<Result>, Effect.Services<Result>>

    const built = yield* Effect.forEach(
      entries,
      ([name, strategy]) => Effect.map(strategy.make, (api) => [name, api] as const)
    )

    const methodsByStrategy = new Map(
      built as ReadonlyArray<readonly [string, Readonly<Record<string, Callable>>]>
    )

    const names = new Set([...methodsByStrategy.values()].flatMap((api) => Object.keys(api)))

    if (
      ["then", "getSession", "requireSession", "verifySession", "signOut", "renewSession"].some(
        (name) => names.has(name)
      )
    ) {
      return yield* AuthConfigurationError.make({ reason: "method" })
    }

    const api = Object.fromEntries(
      [...names].map((name) => [
        name,
        (...args: ReadonlyArray<unknown>) =>
          Effect.suspend(() => {
            const selected = args.length === 2 ? args[0] : defaultStrategy
            const input = args.length === 2 ? args[1] : args[0]

            const methods = typeof selected === "string" ? methodsByStrategy.get(selected) : undefined

            if (args.length > 2 || methods === undefined || !Object.hasOwn(methods, name)) {
              return Effect.die(AuthConfigurationError.make({ reason: "method" }))
            }

            return methods[name](input as never)
          })
      ])
    )

    // The dispatch table is assembled from these exact strategy/method pairs.
    return {
      api: Object.freeze(api) as AuthApi<S, Default>,
      strategies: Object.freeze(Object.fromEntries(built)) as {
        readonly [Name in keyof S]: Api<S[Name]>
      }
    }
  }).pipe(
    Effect.provideService(Layer.CurrentMemoMap, memoMap),
    Scope.provide(scope),
    Effect.onError((cause) => Scope.close(scope, Exit.failCause(cause)))
  )
})

const namespaceSchema = Schema.NonEmptyString.check(
  Schema.isMaxLength(128),
  Schema.isPattern(/^[A-Za-z0-9._:/-]+$/)
)

const strategyNameSchema = Schema.NonEmptyString.check(
  Schema.isMaxLength(64),
  Schema.isPattern(/^[A-Za-z0-9._-]+$/)
)

const configurationError = (
  strategies: StrategySelection,
  defaultStrategy: PropertyKey | undefined,
  namespace: string,
  sessionNamespace: string
) => {
  if (!Schema.is(namespaceSchema)(namespace) || !Schema.is(namespaceSchema)(sessionNamespace)) {
    return AuthConfigurationError.make({ reason: "namespace" })
  }
  const entries = Object.entries(strategies)

  if (entries.some(([key]) => !Schema.is(strategyNameSchema)(key))) {
    return AuthConfigurationError.make({ reason: "strategies" })
  }
  if (defaultStrategy !== undefined && !Object.hasOwn(strategies, defaultStrategy)) {
    return AuthConfigurationError.make({ reason: "default-strategy" })
  }

  const namespaces = entries.flatMap(([key, strategy]) =>
    "bind" in strategy ? [strategy.namespace ?? `${namespace}/${key}`] : []
  )

  if (namespaces.some((id) => !Schema.is(namespaceSchema)(id))) {
    return AuthConfigurationError.make({ reason: "namespace" })
  }

  return undefined
}

/** Bind schemas and service keys once, before choosing the application's adapter Layers. */
const bind = <
  Claims extends ClaimsCodec,
  const S extends StrategySelection = {},
  const Default extends keyof S | undefined = undefined,
  const Id extends string = "effect-auth",
  const SessionId extends string = `${Id}/sessions`,
  const Sessions extends SessionConfiguration | undefined = undefined,
  Contract extends AnyAuthContract | undefined = undefined
>(
  options: Options<Claims, S, Default, Id, SessionId, "effect-auth", Sessions>,
  shared?: Contract
) => {
  const strategies = { ...options.strategies }
  const defaultStrategy = options.defaultStrategy
  // Defaults are fixed credential namespaces, never process-local random identities.
  const namespace = (options.namespace ?? "effect-auth") as Id
  const sessionNamespace = (options.sessionNamespace ?? `${namespace}/sessions`) as SessionId
  const invalid = configurationError(strategies, defaultStrategy, namespace, sessionNamespace)

  if (invalid !== undefined) {
    // oxlint-disable-next-line effect/no-untyped-throw -- Public synchronous Auth construction rejects invalid static configuration.
    throw invalid
  }
  type ContractDefinition = Contract extends AnyAuthContract ? Contract
    : ReturnType<typeof makeContract<Id, Claims>>

  const contract = (shared ??
    makeContract(namespace, { claims: options.claims })) as ContractDefinition

  const sessions = makeSessionModule(
    sessionNamespace,
    options.claims,
    sessionContractFor(contract, sessionNamespace, options.claims)
  )

  const modules = Object.fromEntries(
    Object.entries(strategies).map(([key, strategy]) => [
      key,
      "bind" in strategy
        ? strategy.bind({
          claims: options.claims,
          namespace: strategy.namespace ?? `${namespace}/${key}`,
          sessionNamespace,
          sessions
        })
        : { strategy }
    ])
    // Each descriptor is bound to these exact claims, namespace and selection key.
  ) as BoundStrategies<S, Claims, Id, SessionId>

  const selected = Object.fromEntries(
    Object.entries(modules).map(([key, module]) => [key, module.strategy])
  ) as BoundSelection<typeof modules>

  const create = Effect.gen(function*() {
    const built = yield* build(selected, defaultStrategy)
    const sessionApi = yield* makeSessionApi(sessions)

    const raw: typeof built.api & typeof sessionApi = { ...built.api, ...sessionApi }

    const actions = yield* makeActionApi<
      typeof sessionApi,
      typeof built.strategies,
      Default,
      ContractDefinition["actions"]
    >(sessionApi, built.strategies, defaultStrategy, contract.actions)

    return Object.freeze({ ...raw, ...actions }) as
      & Omit<typeof raw, keyof typeof actions>
      & typeof actions
  })

  const completing = Object.values<Strategy>(selected).some(
    (strategy) => strategy.completion === true
  )

  const configured = options.sessions === undefined
    ? create
    : !completing
    ? withConstructionLayer(create, configuredLayer(sessions, options.sessions))
    : withConstructionLayer(
      create,
      sessions
        .completionLayer()
        .pipe(
          Layer.provideMerge(configuredLayer(sessions, options.sessions)),
          Layer.provide(hooksLayer)
        )
    )

  type SelectedStrategies = (typeof selected)[keyof typeof selected]
  type Completes = true extends CompletionOf<SelectedStrategies> ? true : false
  type ConfigurationRequirements = Sessions extends SessionConfiguration ?
      | SessionRequirements<Sessions, SessionId, Claims>
      | (Completes extends true ? AuthenticationAuthority : never)
    : never
  type Provided = Sessions extends SessionConfiguration ?
      | ModuleService<SessionId, "strategy", Claims["Type"]>
      | (Completes extends true ? ModuleService<SessionId, "completion", Claims["Type"]> : never)
    : never

  // Runtime selection mirrors the session mode and presence of selected methods.
  // Unconfigured definitions retain their explicit strategy/completion requirements.
  const make = configured as Effect.Effect<
    Effect.Success<typeof create>,
    | Effect.Error<typeof create>
    | (Sessions extends SessionConfiguration ? SessionConfigurationError : never),
    Exclude<Effect.Services<typeof create>, Provided> | ConfigurationRequirements
  >

  return Object.freeze({
    claims: options.claims,
    // Persistence capability types retain the constructor's selected mode.
    sessionMode: options.sessions?.mode as Sessions extends SessionConfiguration ? Sessions["mode"]
      : undefined,
    contract,
    namespace,
    sessions,
    strategies: Object.freeze(modules),
    make
  })
}

/** Identifier for a constant auth service. The stable name also isolates its credentials. */
export interface AuthService<Id extends string, Claims> {
  readonly id: Id
  readonly claims: Types.Invariant<Claims>
}

const service = <Self>() =>
<const Id extends string, A, E, R, Definition>(
  id: Id,
  definition: Definition,
  create: Effect.Effect<A, E, R>
) => {
  const Auth = Context.Service<Self, A>()(id)
  const layer = Layer.effect(Auth, create)

  return Object.assign(Auth, definition, { layer })
}

/** Define one yieldable auth service, its schemas, extension ports and runtime Layer. */
const makeService = <
  const Id extends string,
  Claims extends ClaimsCodec,
  const S extends StrategySelection = {},
  const Default extends keyof S | undefined = undefined,
  const Namespace extends string = Id,
  const SessionId extends string = `${Namespace}/sessions`,
  const Sessions extends SessionConfiguration | undefined = undefined,
  Contract extends AnyAuthContract | undefined = undefined
>(
  id: Id,
  options: Options<Claims, S, Default, Namespace, SessionId, Id, Sessions>,
  contract?: Contract
) => {
  if (!Schema.is(Schema.NonEmptyString)(id)) {
    // oxlint-disable-next-line effect/no-untyped-throw -- Public synchronous Auth construction rejects invalid static configuration.
    throw AuthConfigurationError.make({ reason: "id" })
  }

  const definition = bind<Claims, S, Default, Namespace, SessionId, Sessions, Contract>(
    {
      ...options,
      namespace: options.namespace ?? id
    } as Options<Claims, S, Default, Namespace, SessionId, "effect-auth", Sessions>,
    contract
  )

  return service<AuthService<Id, Claims["Type"]>>()(id, definition, definition.make)
}

/** Create a yieldable auth service from a shared contract or service identifier.
 * Use its Layer for provisioning, or yield its make Effect for direct construction.
 * AuthRequest is resolved when a method executes. */
export function make<
  Contract extends AnyAuthContract,
  const S extends StrategySelection = {},
  const Default extends keyof S | undefined = undefined,
  const Sessions extends SessionConfiguration | undefined = undefined
>(
  contract: Contract,
  options: Omit<
    Options<
      Contract["claims"],
      S,
      Default,
      Contract["namespace"],
      `${Contract["namespace"]}/sessions`,
      Contract["namespace"],
      Sessions
    >,
    "claims" | "namespace" | "sessionNamespace"
  >
): ReturnType<
  typeof makeService<
    Contract["namespace"],
    Contract["claims"],
    S,
    Default,
    Contract["namespace"],
    `${Contract["namespace"]}/sessions`,
    Sessions,
    Contract
  >
>

export function make<
  const Id extends string,
  Claims extends ClaimsCodec,
  const S extends StrategySelection = {},
  const Default extends keyof S | undefined = undefined,
  const Namespace extends string = Id,
  const SessionId extends string = `${Namespace}/sessions`,
  const Sessions extends SessionConfiguration | undefined = undefined
>(
  id: Id,
  options: Options<Claims, S, Default, Namespace, SessionId, Id, Sessions>
): ReturnType<typeof makeService<Id, Claims, S, Default, Namespace, SessionId, Sessions>>

export function make(
  definition: string | AnyAuthContract,
  options: {
    readonly claims?: ClaimsCodec
    readonly strategies?: StrategySelection
    readonly sessions?: SessionConfiguration
    readonly defaultStrategy?: string
    readonly namespace?: string
    readonly sessionNamespace?: string
  }
): unknown {
  if (typeof definition !== "string") {
    return makeService(
      definition.namespace,
      {
        ...options,
        namespace: definition.namespace,
        sessionNamespace: `${definition.namespace}/sessions`,
        claims: definition.claims
      },
      definition
    )
  }
  if (options.claims === undefined) {
    // oxlint-disable-next-line effect/no-untyped-throw -- Public synchronous Auth construction rejects invalid static configuration.
    throw AuthConfigurationError.make({ reason: "method" })
  }
  const namespace = options.namespace ?? definition

  return makeService(definition, {
    ...options,
    namespace,
    sessionNamespace: options.sessionNamespace ?? `${namespace}/sessions`,
    claims: options.claims
  })
}

/** Class form of the same auth definition, for applications using named service classes. */
export const Service = <Self>() =>
<
  const Id extends string,
  Claims extends ClaimsCodec,
  const S extends StrategySelection = {},
  const Default extends keyof S | undefined = undefined,
  const Namespace extends string = Id,
  const SessionId extends string = `${Namespace}/sessions`,
  const Sessions extends SessionConfiguration | undefined = undefined
>(
  id: Id,
  options: Options<Claims, S, Default, Namespace, SessionId, Id, Sessions>
) => {
  if (!Schema.is(Schema.NonEmptyString)(id)) {
    // oxlint-disable-next-line effect/no-untyped-throw -- Public synchronous Auth construction rejects invalid static configuration.
    throw AuthConfigurationError.make({ reason: "id" })
  }

  const definition = bind<Claims, S, Default, Namespace, SessionId, Sessions>({
    ...options,
    namespace: options.namespace ?? id
  } as Options<Claims, S, Default, Namespace, SessionId, "effect-auth", Sessions>)

  return service<Self>()(id, definition, definition.make)
}
