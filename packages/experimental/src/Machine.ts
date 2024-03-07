/**
 * @since 1.0.0
 */
import type * as ParseResult from "@effect/schema/ParseResult"
import * as Schema from "@effect/schema/Schema"
import * as Serializable from "@effect/schema/Serializable"
import * as Cause from "effect/Cause"
import * as Context from "effect/Context"
import * as Deferred from "effect/Deferred"
import * as Effect from "effect/Effect"
import * as Fiber from "effect/Fiber"
import * as FiberMap from "effect/FiberMap"
import * as FiberRef from "effect/FiberRef"
import * as FiberRefs from "effect/FiberRefs"
import * as FiberSet from "effect/FiberSet"
import { dual, identity } from "effect/Function"
import { globalValue } from "effect/GlobalValue"
import * as MutableHashMap from "effect/MutableHashMap"
import * as Option from "effect/Option"
import { type Pipeable, pipeArguments } from "effect/Pipeable"
import * as Predicate from "effect/Predicate"
import * as PubSub from "effect/PubSub"
import * as Queue from "effect/Queue"
import type { Request } from "effect/Request"
import type * as Schedule from "effect/Schedule"
import type * as Scope from "effect/Scope"
import * as Stream from "effect/Stream"
import * as Tracer from "effect/Tracer"
import type * as Types from "effect/Types"
import * as Procedure from "./Machine/Procedure.js"
import type * as ProcedureList from "./Machine/ProcedureList.js"

/**
 * @since 1.0.0
 * @category procedures ids
 */
export * as procedures from "./Machine/ProcedureList.js"

export {
  /**
   * @since 1.0.0
   * @category symbols
   */
  NoReply
} from "./Machine/Procedure.js"

/**
 * @since 1.0.0
 * @category type ids
 */
export const TypeId = Symbol.for("@effect/experimental/Machine")

/**
 * @since 1.0.0
 * @category type ids
 */
export type TypeId = typeof TypeId

/**
 * @since 1.0.0
 * @category refinements
 */
export const isMachine = (
  u: unknown
): u is Machine<unknown, Schema.TaggedRequest.Any, Schema.TaggedRequest.Any, unknown, unknown, unknown> =>
  Predicate.hasProperty(u, TypeId)

/**
 * @since 1.0.0
 * @category models
 */
export interface Machine<
  State,
  Public extends Schema.TaggedRequest.Any,
  Private extends Schema.TaggedRequest.Any,
  Input,
  InitErr,
  R
> extends Pipeable {
  readonly [TypeId]: TypeId
  readonly initialize: Machine.Initialize<Input, State, Public, Private, InitErr, R, R>
  readonly retryPolicy: Schedule.Schedule<unknown, InitErr | MachineError, R> | undefined
}

/**
 * @since 1.0.0
 * @category type ids
 */
export const SerializableTypeId = Symbol.for("@effect/experimental/Machine/Serializable")

/**
 * @since 1.0.0
 * @category type ids
 */
export type SerializableTypeId = typeof SerializableTypeId

/**
 * @since 1.0.0
 * @category models
 */
export interface SerializableMachine<
  State,
  Public extends Schema.TaggedRequest.Any,
  Private extends Schema.TaggedRequest.Any,
  Input,
  InitErr,
  R,
  SR
> extends
  Machine<
    State,
    Public,
    Private,
    Input,
    InitErr,
    R
  >
{
  readonly [SerializableTypeId]: SerializableTypeId
  readonly schemaInput: Schema.Schema<Input, unknown, SR>
  readonly schemaState: Schema.Schema<State, unknown, SR>
}

/**
 * @since 1.0.0
 * @category type ids
 */
export const ActorTypeId = Symbol.for("@effect/experimental/Machine/Actor")

/**
 * @since 1.0.0
 * @category type ids
 */
export type ActorTypeId = typeof ActorTypeId

/**
 * @since 1.0.0
 * @category errors
 */
export class MachineError extends Schema.TaggedError<MachineError>()("MachineError", {
  cause: Schema.cause<never, never, never>({ error: Schema.never })
}) {
  /**
   * @since 1.0.0
   */
  static wrap<A, E, R>(effect: Effect.Effect<A, E, R>): Effect.Effect<A, MachineError, R> {
    return Effect.catchAllCause(
      Effect.orDie(effect),
      (cause) => Effect.fail(new MachineError({ cause }))
    )
  }

  /**
   * @since 1.0.0
   */
  get message() {
    return Cause.pretty(this.cause)
  }
}

/**
 * @since 1.0.0
 * @category tags
 */
export class MachineContext extends Context.Tag("@effect/experimental/Machine/Context")<
  MachineContext,
  Procedure.Procedure.BaseContext
>() {}

/**
 * @since 1.0.0
 * @category models
 */
export declare namespace Machine {
  /**
   * @since 1.0.0
   * @category models
   */
  export type Any =
    | Machine<any, any, any, any, any, any>
    | Machine<any, any, any, any, never, any>
    | Machine<any, never, any, any, never, any>
    | Machine<any, any, never, any, never, any>
    | Machine<any, never, never, any, never, any>

  /**
   * @since 1.0.0
   * @category models
   */
  export type Initialize<
    Input,
    State,
    Public extends Schema.TaggedRequest.Any,
    Private extends Schema.TaggedRequest.Any,
    R,
    E,
    InitR
  > = (
    input: Input,
    previousState?: State | undefined
  ) => Effect.Effect<ProcedureList.ProcedureList<State, Public, Private, R>, E, InitR>

  /**
   * @since 1.0.0
   */
  export type Public<M> = M extends Machine<infer _S, infer Public, infer _Pr, infer _I, infer _IE, infer _R> ? Public
    : never

  /**
   * @since 1.0.0
   */
  export type Private<M> = M extends Machine<infer _S, infer _Pu, infer Private, infer _I, infer _IE, infer _R> ?
    Private
    : never

  /**
   * @since 1.0.0
   */
  export type State<M> = M extends Machine<infer State, infer _Pu, infer _Pr, infer _I, infer _IE, infer _R> ? State
    : never

  /**
   * @since 1.0.0
   */
  export type InitError<M> = M extends Machine<infer _S, infer _Pu, infer _Pr, infer _I, infer InitErr, infer _R> ?
    InitErr
    : never

  /**
   * @since 1.0.0
   */
  export type Context<M> = M extends Machine<infer _S, infer _Pu, infer _Pr, infer _I, infer _IE, infer R> ? R
    : never

  /**
   * @since 1.0.0
   */
  export type Input<M> = M extends Machine<infer _S, infer _Pu, infer _Pr, infer Input, infer _IE, infer _R> ? Input
    : never

  /**
   * @since 1.0.0
   */
  export type Modify<M, State, Public extends Schema.TaggedRequest.Any, Private extends Schema.TaggedRequest.Any, R> =
    M extends SerializableMachine<
      infer _S,
      infer _Pu,
      infer _Pr,
      infer Input,
      infer InitErr,
      infer _R,
      infer SR
    > ? SerializableMachine<
        State,
        Public,
        Private,
        Input,
        InitErr,
        R,
        SR
      > :
      M extends Machine<infer _S, infer _Pu, infer _Pr, infer Input, infer InitErr, infer _R> ? Machine<
          State,
          Public,
          Private,
          Input,
          InitErr,
          R
        > :
      never

  /**
   * @since 1.0.0
   */
  export type AddContext<M, R, E = never> = M extends SerializableMachine<
    infer State,
    infer Public,
    infer Private,
    infer Input,
    infer InitErr,
    infer R2,
    infer SR
  > ? SerializableMachine<
      State,
      Public,
      Private,
      Input,
      InitErr | E,
      R | R2,
      SR
    > :
    M extends Machine<infer State, infer Public, infer Private, infer Input, infer InitErr, infer R2> ? Machine<
        State,
        Public,
        Private,
        Input,
        InitErr | E,
        R | R2
      > :
    never
}

/**
 * @since 1.0.0
 * @category models
 */
export interface Actor<M extends Machine.Any> {
  readonly [ActorTypeId]: ActorTypeId
  readonly machine: M
  readonly input: Machine.Input<M>
  readonly send: <Req extends Machine.Public<M>>(request: Req) => Effect.Effect<
    Request.Success<Req>,
    Request.Error<Req>
  >
  readonly sendUnknown: (request: unknown) => Effect.Effect<
    Schema.ExitFrom<unknown, unknown>,
    ParseResult.ParseError
  >
  readonly state: Effect.Effect<Machine.State<M>>
  readonly subscribe: Effect.Effect<Queue.Dequeue<Machine.State<M>>, never, Scope.Scope>
  readonly stream: Stream.Stream<Machine.State<M>>
  readonly streamWithInitial: Stream.Stream<Machine.State<M>>
  readonly join: Effect.Effect<never, Machine.InitError<M> | MachineError>
}

/**
 * @since 1.0.0
 * @category constructors
 */
export const make: {
  <State, Public extends Schema.TaggedRequest.Any, Private extends Schema.TaggedRequest.Any, InitErr, R>(
    initialize: Effect.Effect<ProcedureList.ProcedureList<State, Public, Private, R>, InitErr, R>
  ): Machine<State, Public, Private, void, InitErr, Exclude<R, Scope.Scope | MachineContext>>
  <State, Public extends Schema.TaggedRequest.Any, Private extends Schema.TaggedRequest.Any, Input, InitErr, R>(
    initialize: Machine.Initialize<Input, State, Public, Private, R, InitErr, R>
  ): Machine<State, Public, Private, Input, InitErr, Exclude<R, Scope.Scope | MachineContext>>
} = <State, Public extends Schema.TaggedRequest.Any, Private extends Schema.TaggedRequest.Any, Input, InitErr, R>(
  initialize:
    | Machine.Initialize<Input, State, Public, Private, R, InitErr, R>
    | Effect.Effect<ProcedureList.ProcedureList<State, Public, Private, R>, InitErr, R>
): Machine<State, Public, Private, Input, InitErr, Exclude<R, Scope.Scope | MachineContext>> => ({
  [TypeId]: TypeId,
  initialize: Effect.isEffect(initialize) ? (() => initialize) : initialize as any,
  retryPolicy: undefined,
  pipe() {
    return pipeArguments(this, arguments)
  }
})

/**
 * @since 1.0.0
 * @category constructors
 */
export const makeWith = <State>(): {
  <Public extends Schema.TaggedRequest.Any, Private extends Schema.TaggedRequest.Any, InitErr, R>(
    initialize: Effect.Effect<ProcedureList.ProcedureList<State, Public, Private, R>, InitErr, R>
  ): Machine<State, Public, Private, void, InitErr, Exclude<R, Scope.Scope | MachineContext>>
  <Public extends Schema.TaggedRequest.Any, Private extends Schema.TaggedRequest.Any, Input, InitErr, R>(
    initialize: Machine.Initialize<Input, State, Public, Private, R, InitErr, R>
  ): Machine<State, Public, Private, Input, InitErr, Exclude<R, Scope.Scope | MachineContext>>
} => make

/**
 * @since 1.0.0
 * @category constructors
 */
export const makeSerializable: {
  <State, IS, RS, Public extends Schema.TaggedRequest.Any, Private extends Schema.TaggedRequest.Any, InitErr, R>(
    options: {
      readonly state: Schema.Schema<State, IS, RS>
    },
    initialize:
      | Effect.Effect<ProcedureList.ProcedureList<State, Public, Private, R>, InitErr, R>
      | Machine.Initialize<void, State, Public, Private, R, InitErr, R>
  ): SerializableMachine<State, Public, Private, void, InitErr, Exclude<R, Scope.Scope | MachineContext>, RS>
  <
    State,
    IS,
    RS,
    Input,
    II,
    RI,
    Public extends Schema.TaggedRequest.Any,
    Private extends Schema.TaggedRequest.Any,
    InitErr,
    R
  >(
    options: {
      readonly state: Schema.Schema<State, IS, RS>
      readonly input: Schema.Schema<Input, II, RI>
    },
    initialize: Machine.Initialize<Input, State, Public, Private, R, InitErr, R>
  ): SerializableMachine<State, Public, Private, Input, InitErr, Exclude<R, Scope.Scope | MachineContext>, RS | RI>
} = <
  State,
  IS,
  RS,
  Input,
  II,
  RI,
  Public extends Schema.TaggedRequest.Any,
  Private extends Schema.TaggedRequest.Any,
  InitErr,
  R
>(
  options: {
    readonly state: Schema.Schema<State, IS, RS>
    readonly input?: Schema.Schema<Input, II, RI>
  },
  initialize:
    | Machine.Initialize<Input, State, Public, Private, R, InitErr, R>
    | Effect.Effect<ProcedureList.ProcedureList<State, Public, Private, R>, InitErr, R>
): SerializableMachine<State, Public, Private, Input, InitErr, Exclude<R, Scope.Scope | MachineContext>, RS | RI> =>
  ({
    [TypeId]: TypeId,
    [SerializableTypeId]: SerializableTypeId,
    initialize: Effect.isEffect(initialize) ? (() => initialize) : initialize as any,
    identifier: "SerializableMachine",
    retryPolicy: undefined,
    schemaInput: options.input as any,
    schemaState: options.state as any,
    pipe() {
      return pipeArguments(this, arguments)
    }
  }) as any

/**
 * @since 1.0.0
 * @category combinators
 */
export const modify: {
  <M extends Machine.Any, State, Public extends Schema.TaggedRequest.Any, Private extends Schema.TaggedRequest.Any, R>(
    f: (
      _: ProcedureList.ProcedureList<Machine.State<M>, Machine.Public<M>, Machine.Private<M>, Machine.Context<M>>
    ) => ProcedureList.ProcedureList<State, Public, Private, R>
  ): (self: M) => Machine.Modify<M, State, Public, Private, Exclude<R, Scope.Scope | MachineContext>>
  <M extends Machine.Any, State, Public extends Schema.TaggedRequest.Any, Private extends Schema.TaggedRequest.Any, R>(
    self: M,
    f: (
      _: ProcedureList.ProcedureList<Machine.State<M>, Machine.Public<M>, Machine.Private<M>, Machine.Context<M>>
    ) => ProcedureList.ProcedureList<State, Public, Private, R>
  ): Machine.Modify<M, State, Public, Private, Exclude<R, Scope.Scope | MachineContext>>
} = dual(
  2,
  <M extends Machine.Any, State, Public extends Schema.TaggedRequest.Any, Private extends Schema.TaggedRequest.Any, R>(
    self: M,
    f: (
      _: ProcedureList.ProcedureList<Machine.State<M>, Machine.Public<M>, Machine.Private<M>, Machine.Context<M>>
    ) => ProcedureList.ProcedureList<State, Public, Private, R>
  ): Machine.Any => ({
    ...self,
    initialize(input, previousState) {
      return Effect.map(
        self.initialize(input, previousState) as any,
        f
      )
    }
  })
)

/**
 * @since 1.0.0
 * @category combinators
 */
export const addInitializer: {
  <M extends Machine.Any, A, E, R>(
    f: (
      state: Machine.State<M>,
      ctx: Procedure.Procedure.Context<Machine.Public<M> | Machine.Private<M>, Machine.State<M>>
    ) => Effect.Effect<A, E, R>
  ): (self: M) => Machine.AddContext<M, Exclude<R, Scope.Scope | MachineContext>, E>
  <M extends Machine.Any, A, E, R>(
    self: M,
    f: (
      state: Machine.State<M>,
      ctx: Procedure.Procedure.Context<Machine.Public<M> | Machine.Private<M>, Machine.State<M>>
    ) => Effect.Effect<A, E, R>
  ): Machine.AddContext<M, Exclude<R, Scope.Scope | MachineContext>, E>
} = dual(2, <M extends Machine.Any, A, E, R>(
  self: M,
  f: (
    state: Machine.State<M>,
    ctx: Procedure.Procedure.Context<Machine.Public<M>, Machine.State<M>>
  ) => Effect.Effect<A, E, R>
): Machine.Any => ({
  ...self,
  initialize(input, previousState) {
    return Effect.tap(
      self.initialize(input, previousState) as Effect.Effect<ProcedureList.ProcedureList<any, any, any, any>>,
      (list) =>
        Effect.flatMap(
          MachineContext,
          (ctx) => f(list.initialState, ctx as any)
        )
    )
  }
}))

/**
 * @since 1.0.0
 * @category combinators
 */
export const retry: {
  <M extends Machine.Any, Out, In extends Machine.InitError<M> | MachineError, R>(
    policy: Schedule.Schedule<Out, In, R>
  ): (self: M) => Machine.AddContext<M, R>
  <M extends Machine.Any, Out, In extends Machine.InitError<M> | MachineError, R>(
    self: M,
    policy: Schedule.Schedule<Out, In, R>
  ): Machine.AddContext<M, R>
} = dual(2, <M extends Machine.Any, Out, In extends Machine.InitError<M> | MachineError, R>(
  self: M,
  retryPolicy: Schedule.Schedule<Out, In, R>
): Machine.AddContext<M, R> =>
  ({
    ...self,
    retryPolicy
  }) as any)

/**
 * @since 1.0.0
 * @category combinators
 */
export const toSerializable: {
  <State, IS, SR, Input, II, IR>(
    options: {
      readonly state: Schema.Schema<Types.NoInfer<State>, IS, SR>
      readonly input: Schema.Schema<Types.NoInfer<Input>, II, IR>
    }
  ): <Public extends Schema.TaggedRequest.Any, Private extends Schema.TaggedRequest.Any, InitErr, R>(
    self: Machine<State, Public, Private, Input, InitErr, R>
  ) => SerializableMachine<
    State,
    Public,
    Private,
    Input,
    InitErr,
    R,
    SR | IR
  >
  <
    State,
    Public extends Schema.TaggedRequest.Any,
    Private extends Schema.TaggedRequest.Any,
    Input,
    InitErr,
    R,
    IS,
    SR,
    II,
    IR
  >(
    self: Machine<State, Public, Private, Input, InitErr, R>,
    options: {
      readonly state: Schema.Schema<Types.NoInfer<State>, IS, SR>
      readonly input: Schema.Schema<Types.NoInfer<Input>, II, IR>
    }
  ): SerializableMachine<
    State,
    Public,
    Private,
    Input,
    InitErr,
    R,
    SR | IR
  >
} = dual(2, <
  State,
  Public extends Schema.TaggedRequest.Any,
  Private extends Schema.TaggedRequest.Any,
  Input,
  InitErr,
  R,
  IS,
  SR,
  II,
  IR
>(
  self: Machine<State, Public, Private, Input, InitErr, R>,
  options: {
    readonly state: Schema.Schema<Types.NoInfer<State>, IS, SR>
    readonly input: Schema.Schema<Types.NoInfer<Input>, II, IR>
  }
): SerializableMachine<
  State,
  Public,
  Private,
  Input,
  InitErr,
  R,
  SR | IR
> => ({
  ...self,
  [SerializableTypeId]: SerializableTypeId,
  schemaInput: options.input as any,
  schemaState: options.state as any
}))

/**
 * @since 1.0.0
 * @category tracing
 */
export const currentTracingEnabled: FiberRef.FiberRef<boolean> = globalValue(
  "@effect/experimental/Machine/currentTracingEnabled",
  () => FiberRef.unsafeMake(true)
)

/**
 * @since 1.0.0
 * @category tracing
 */
export const withTracingEnabled: {
  (enabled: boolean): <A, E, R>(effect: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R>
  <A, E, R>(effect: Effect.Effect<A, E, R>, enabled: boolean): Effect.Effect<A, E, R>
} = dual(
  2,
  <A, E, R>(self: Effect.Effect<A, E, R>, enabled: boolean) => Effect.locally(self, currentTracingEnabled, enabled)
)

/**
 * @since 1.0.0
 * @category runtime
 */
export const boot = <
  M extends Machine.Any
>(
  self: M,
  ...[input, options]: [Machine.Input<M>] extends [void] ? [
      input?: Machine.Input<M>,
      options?: { readonly previousState?: Machine.State<M> }
    ] :
    [
      input: Machine.Input<M>,
      options?: { readonly previousState?: Machine.State<M> }
    ]
): Effect.Effect<Actor<M>, never, Machine.Context<M> | Scope.Scope> =>
  Effect.gen(function*(_) {
    const context = yield* _(Effect.context<Machine.Context<M>>())
    const requests = yield* _(Queue.unbounded<
      readonly [
        Schema.TaggedRequest.Any,
        Deferred.Deferred<any, any>,
        Tracer.ParentSpan | undefined,
        addSpans: boolean
      ]
    >())
    const pubsub = yield* _(Effect.acquireRelease(
      PubSub.unbounded<Machine.State<M>>(),
      PubSub.shutdown
    ))
    const latch = yield* _(Deferred.make<void>())

    let currentState: Machine.State<M> = undefined as any
    let runState: {
      readonly identifier: string
      readonly publicTags: Set<string>
      readonly schemaUnion: Schema.Schema<Machine.Public<M>, unknown>
    } = {
      identifier: "Unknown",
      publicTags: new Set<string>(),
      schemaUnion: undefined as any
    }

    const requestContext = <R extends Machine.Public<M>>(request: R) =>
      Effect.sync(() => {
        const fiber = Option.getOrThrow(Fiber.getCurrentFiber())
        const fiberRefs = fiber.getFiberRefs()
        const context = FiberRefs.getOrDefault(fiberRefs, FiberRef.currentContext)

        const deferred = Deferred.unsafeMake<Request.Success<R>, Request.Error<R>>(fiber.id())
        const span: Tracer.ParentSpan | undefined = context.unsafeMap.get(Tracer.ParentSpan.key)
        const addSpans = FiberRefs.getOrDefault(fiberRefs, currentTracingEnabled)

        return [request, deferred, span, addSpans] as const
      })

    const send = <R extends Machine.Public<M>>(request: R) =>
      Effect.flatMap(
        requestContext(request),
        (item) => {
          if (!item[3]) {
            return Queue.offer(requests, item).pipe(
              Effect.zipRight(Deferred.await(item[1])),
              Effect.onInterrupt(() => Deferred.interrupt(item[1]))
            )
          }
          const [, deferred, span] = item
          return Effect.useSpan(`Machine.send ${request._tag}`, {
            parent: span,
            attributes: {
              "effect.machine": runState.identifier,
              ...request
            }
          }, (span) =>
            Queue.offer(requests, [request, deferred, span, true]).pipe(
              Effect.zipRight(Deferred.await(deferred)),
              Effect.onInterrupt(() => Deferred.interrupt(deferred))
            ))
        }
      )

    const sendIgnore = <R extends Machine.Public<M>>(request: R) =>
      Effect.flatMap(
        requestContext(request),
        (item) => {
          if (!item[3]) {
            return Queue.offer(requests, item)
          }
          const [, deferred, span] = item
          return Effect.useSpan(`Machine.sendIgnore ${request._tag}`, {
            parent: span,
            attributes: {
              "effect.machine": runState.identifier,
              ...request
            }
          }, (span) => Queue.offer(requests, [request, deferred, span, true]))
        }
      )

    const sendExternal = <R extends Machine.Public<M>>(request: R) =>
      Effect.suspend(() =>
        runState.publicTags.has(request._tag)
          ? send(request)
          : Effect.die(`Request ${request._tag} marked as internal`)
      )

    const sendUnknown = (u: unknown) =>
      Effect.suspend(() =>
        Schema.decodeUnknown(runState.schemaUnion)(u).pipe(
          Effect.flatMap((req) =>
            Effect.flatMap(
              Effect.exit(send(req)),
              (exit) => Serializable.serializeExit(req, exit)
            )
          ),
          Effect.provide(context)
        )
      ) as Effect.Effect<Schema.ExitFrom<unknown, unknown>, ParseResult.ParseError>

    const publishState = (newState: Machine.State<M>) => {
      if (currentState !== newState) {
        currentState = newState
        return PubSub.publish(pubsub, newState)
      }
      return Effect.unit
    }

    const run = Effect.gen(function*(_) {
      const fiberSet = yield* _(FiberSet.make<any, MachineError>())
      const fiberMap = yield* _(FiberMap.make<string, any, MachineError>())

      const fork = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
        Effect.asUnit(FiberSet.run(fiberSet, MachineError.wrap(effect)))
      const forkWith: {
        (state: Machine.State<M>): <A, E, R>(
          effect: Effect.Effect<A, E, R>
        ) => Effect.Effect<readonly [void, Machine.State<M>], never, R>
        <A, E, R>(
          effect: Effect.Effect<A, E, R>,
          state: Machine.State<M>
        ): Effect.Effect<readonly [void, Machine.State<M>], never, R>
      } = dual(2, <A, E, R>(
        effect: Effect.Effect<A, E, R>,
        state: Machine.State<M>
      ): Effect.Effect<readonly [void, Machine.State<M>], never, R> =>
        Effect.map(fork(effect), (_) => [_, state] as const))

      const forkReplace: {
        (id: string): <A, E, R>(effect: Effect.Effect<A, E, R>) => Effect.Effect<void, never, R>
        <A, E, R>(effect: Effect.Effect<A, E, R>, id: string): Effect.Effect<void, never, R>
      } = dual(2, <A, E, R>(effect: Effect.Effect<A, E, R>, id: string): Effect.Effect<void, never, R> =>
        Effect.asUnit(
          FiberMap.run(fiberMap, id, MachineError.wrap(effect))
        ))
      const forkReplaceWith: {
        (
          id: string,
          state: Machine.State<M>
        ): <A, E, R>(effect: Effect.Effect<A, E, R>) => Effect.Effect<readonly [void, Machine.State<M>], never, R>
        <A, E, R>(
          effect: Effect.Effect<A, E, R>,
          id: string,
          state: Machine.State<M>
        ): Effect.Effect<readonly [void, Machine.State<M>], never, R>
      } = dual(3, <A, E, R>(
        effect: Effect.Effect<A, E, R>,
        id: string,
        state: Machine.State<M>
      ): Effect.Effect<readonly [void, Machine.State<M>], never, R> =>
        Effect.map(forkReplace(effect, id), (_) => [_, state] as const))

      const forkOne: {
        (id: string): <A, E, R>(effect: Effect.Effect<A, E, R>) => Effect.Effect<void, never, R>
        <A, E, R>(effect: Effect.Effect<A, E, R>, id: string): Effect.Effect<void, never, R>
      } = dual(2, <A, E, R>(effect: Effect.Effect<A, E, R>, id: string): Effect.Effect<void, never, R> =>
        Effect.suspend(() => {
          if (MutableHashMap.has(fiberMap.backing, id)) {
            return Effect.unit
          }
          return forkReplace(effect, id)
        }))
      const forkOneWith: {
        (
          id: string,
          state: Machine.State<M>
        ): <A, E, R>(effect: Effect.Effect<A, E, R>) => Effect.Effect<readonly [void, Machine.State<M>], never, R>
        <A, E, R>(
          effect: Effect.Effect<A, E, R>,
          id: string,
          state: Machine.State<M>
        ): Effect.Effect<readonly [void, Machine.State<M>], never, R>
      } = dual(3, <A, E, R>(
        effect: Effect.Effect<A, E, R>,
        id: string,
        state: Machine.State<M>
      ): Effect.Effect<readonly [void, Machine.State<M>], never, R> =>
        Effect.map(
          forkOne(effect, id),
          (_) =>
            [_, state] as const
        ))

      const context: Procedure.Procedure.Context<Machine.Public<M>, Machine.State<M>> = {
        sendAwait: send,
        send: sendIgnore,
        fork,
        forkWith,
        forkOne,
        forkOneWith,
        forkReplace,
        forkReplaceWith
      }

      const procedures = yield* _(
        self.initialize(input, currentState ?? options?.previousState) as Effect.Effect<
          ProcedureList.ProcedureList<Machine.State<M>, Machine.Public<M>, Machine.Private<M>, never>,
          Machine.InitError<M>
        >,
        Effect.provideService(MachineContext, context)
      )
      const procedureMap: Record<
        string,
        Procedure.Procedure<any, Machine.State<M>, Machine.Context<M>>
      > = Object.fromEntries(
        procedures.private.map((p) => [p.tag, p]).concat(
          procedures.public.map((p) => [p.tag, p])
        )
      )

      runState = {
        identifier: procedures.identifier,
        publicTags: new Set(procedures.public.map((p) =>
          p.tag
        )),
        schemaUnion: Schema.union(...procedures.public.map((p) => p.schema))
      }
      yield* _(publishState(procedures.initialState))
      yield* _(Deferred.succeed(latch, void 0))

      yield* _(
        Queue.take(requests),
        Effect.flatMap(([request, deferred, span, addSpan]) =>
          Effect.flatMap(Deferred.isDone(deferred), (done) => {
            if (done) {
              return Effect.unit
            }

            const procedure = procedureMap[request._tag]
            if (procedure === undefined) {
              return Effect.die(`Unknown request ${request._tag}`)
            }

            let handler = Effect.matchCauseEffect(procedure.handler(request, currentState, context, deferred), {
              onFailure: (e) => {
                if (Cause.isFailure(e)) {
                  return Deferred.failCause(deferred, e)
                }
                return Effect.zipRight(
                  Deferred.failCause(deferred, e),
                  Effect.failCause(e)
                )
              },
              onSuccess: ([response, newState]) => {
                if (response === Procedure.NoReply) {
                  return publishState(newState)
                }
                return Effect.zipRight(
                  publishState(newState),
                  Deferred.succeed(deferred, response)
                )
              }
            })
            if (addSpan) {
              handler = Effect.withSpan(handler, `Machine.process ${request._tag}`, {
                parent: span,
                attributes: {
                  "effect.machine": runState.identifier
                }
              })
            } else if (span !== undefined) {
              handler = Effect.provideService(handler, Tracer.ParentSpan, span)
            }

            return handler
          })
        ),
        Effect.forever,
        Effect.provideService(MachineContext, context),
        Effect.raceFirst(FiberSet.join(fiberSet)),
        Effect.raceFirst(FiberMap.join(fiberMap)),
        Effect.onExit((exit) => {
          if (exit._tag === "Success") return Effect.die("absurd")
          return Effect.flatMap(
            Queue.takeAll(requests),
            Effect.forEach(([, deferred]) => Deferred.failCause(deferred, exit.cause))
          )
        })
      )
    }).pipe(Effect.scoped) as Effect.Effect<
      never,
      MachineError | Machine.InitError<M>
    >

    const fiber = yield* _(
      run,
      self.retryPolicy ?
        Effect.retry(self.retryPolicy) :
        identity,
      Effect.forkScoped,
      Effect.interruptible
    )

    yield* _(Deferred.await(latch))

    return identity<Actor<M>>({
      [ActorTypeId]: ActorTypeId,
      machine: self,
      input: input!,
      state: Effect.sync(() => currentState),
      subscribe: PubSub.subscribe(pubsub),
      stream: Stream.fromPubSub(pubsub),
      streamWithInitial: Stream.concat(
        Stream.sync(() => currentState),
        Stream.fromPubSub(pubsub)
      ),
      send: sendExternal,
      sendUnknown,
      join: Fiber.join(fiber)
    })
  })

/**
 * @since 1.0.0
 * @category runtime
 */
export const snapshot = <
  State,
  Public extends Schema.TaggedRequest.Any,
  Private extends Schema.TaggedRequest.Any,
  Input,
  InitErr,
  R,
  SR
>(
  self: Actor<
    SerializableMachine<
      State,
      Public,
      Private,
      Input,
      InitErr,
      R,
      SR
    >
  >
): Effect.Effect<[input: unknown, state: unknown], ParseResult.ParseError, SR> =>
  Effect.zip(
    Schema.encode(self.machine.schemaInput)(self.input),
    Effect.flatMap(self.state, Schema.encode(self.machine.schemaState))
  )

/**
 * @since 1.0.0
 * @category runtime
 */
export const restore = <
  State,
  Public extends Schema.TaggedRequest.Any,
  Private extends Schema.TaggedRequest.Any,
  Input,
  InitErr,
  R,
  SR
>(
  self: SerializableMachine<
    State,
    Public,
    Private,
    Input,
    InitErr,
    R,
    SR
  >,
  snapshot: readonly [input: unknown, state: unknown]
): Effect.Effect<
  Actor<
    SerializableMachine<
      State,
      Public,
      Private,
      Input,
      InitErr,
      R,
      SR
    >
  >,
  ParseResult.ParseError,
  R | SR
> =>
  Effect.flatMap(
    Schema.decodeUnknown(Schema.tuple(self.schemaInput, self.schemaState))(snapshot),
    ([input, previousState]) => (boot as any)(self, input, { previousState })
  )
