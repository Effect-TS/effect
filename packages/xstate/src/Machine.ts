/**
 * @since 1.0.0
 */
import type * as ParseResult from "@effect/schema/ParseResult"
import * as Schema from "@effect/schema/Schema"
import type * as Context from "effect/Context"
import * as Deferred from "effect/Deferred"
import * as Effect from "effect/Effect"
import * as Fiber from "effect/Fiber"
import * as FiberSet from "effect/FiberSet"
import { dual, identity, pipe } from "effect/Function"
import { type Pipeable, pipeArguments } from "effect/Pipeable"
import * as Predicate from "effect/Predicate"
import * as PubSub from "effect/PubSub"
import * as Queue from "effect/Queue"
import type { Request } from "effect/Request"
import type * as Scope from "effect/Scope"
import * as Stream from "effect/Stream"
import type * as Types from "effect/Types"
import * as Procedure from "./Procedure.js"

/**
 * @since 1.0.0
 * @category type ids
 */
export const TypeId = Symbol.for("@effect/xstate/Machine")

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
): u is Machine<Schema.TaggedRequest.Any, unknown, unknown, unknown, unknown, unknown> =>
  Predicate.hasProperty(u, TypeId)

/**
 * @since 1.0.0
 * @category models
 */
export interface Machine<Request extends Schema.TaggedRequest.Any, State, Input, InitErr, R, XR> extends Pipeable {
  readonly [TypeId]: TypeId
  readonly initialize: Machine.Initialize<Input, State, XR, InitErr, R>
  readonly procedures: ReadonlyArray<Procedure.Procedure<Request, State, R>>
  readonly internalTags: ReadonlyArray<string>
}

/**
 * @since 1.0.0
 * @category type ids
 */
export const SerializableTypeId = Symbol.for("@effect/xstate/Machine/Serializable")

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
  Request extends Schema.TaggedRequest.Any,
  State,
  Input,
  InitErr,
  R,
  SR,
  XR
> extends
  Machine<
    Request,
    State,
    Input,
    InitErr,
    R,
    XR
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
export const BootedTypeId = Symbol.for("@effect/xstate/Machine/Booted")

/**
 * @since 1.0.0
 * @category type ids
 */
export type BootedTypeId = typeof BootedTypeId

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
    | Machine<any, any, any, any, any, never>
    | Machine<any, any, any, never, any, any>
    | Machine<any, any, any, never, any, never>
    | Machine<never, any, any, never, any, any>
    | Machine<never, any, any, never, any, never>

  /**
   * @since 1.0.0
   * @category models
   */
  export type AnySerializible =
    | SerializableMachine<any, any, any, any, any, any, any>
    | SerializableMachine<any, any, any, never, any, any, any>
    | SerializableMachine<any, any, any, any, any, any, never>
    | SerializableMachine<any, any, any, never, any, any, never>

  /**
   * @since 1.0.0
   * @category models
   */
  export type Initialize<Input, State, XR, E, R> = (
    input: Input,
    previousState?: State | undefined
  ) => Effect.Effect<readonly [initialState: State, context: Context.Context<XR>], E, R>

  /**
   * @since 1.0.0
   */
  export type Requests<M> = M extends Machine<infer Requests, infer _S, infer _I, infer _IE, infer _R, infer _XR> ?
    Requests
    : never

  /**
   * @since 1.0.0
   */
  export type State<M> = M extends Machine<infer _Req, infer State, infer _I, infer _IE, infer _R, infer _XR> ? State
    : never

  /**
   * @since 1.0.0
   */
  export type InitError<M> = M extends Machine<infer _Req, infer _S, infer _I, infer InitErr, infer _R, infer _XR> ?
    InitErr
    : never

  /**
   * @since 1.0.0
   */
  export type Context<M> = M extends Machine<infer _Req, infer _S, infer _I, infer _IE, infer R, infer XR>
    ? Exclude<R, XR>
    : never

  /**
   * @since 1.0.0
   */
  export type ContextWithSchema<M> = M extends
    SerializableMachine<infer _Req, infer _S, infer _I, infer _IE, infer R, infer SR, infer XR> ? Exclude<R | SR, XR> :
    never

  /**
   * @since 1.0.0
   */
  export type Input<M> = M extends Machine<infer _Req, infer _S, infer Input, infer _IE, infer _R, infer _XR> ? Input
    : never

  /**
   * @since 1.0.0
   */
  export type AddRequest<M, Req extends Schema.TaggedRequest.Any, R> = M extends SerializableMachine<
    infer Requests,
    infer State,
    infer Input,
    infer InitErr,
    infer InitR,
    infer SR,
    infer XR
  > ? SerializableMachine<
      Requests | Req,
      State,
      Input,
      InitErr,
      InitR | Exclude<R, Scope.Scope | XR>,
      SR,
      XR
    > :
    M extends Machine<infer Requests, infer State, infer Input, infer InitErr, infer InitR, infer XR> ? Machine<
        Requests | Req,
        State,
        Input,
        InitErr,
        InitR | Exclude<R, Scope.Scope | XR>,
        XR
      > :
    never

  /**
   * @since 1.0.0
   */
  export type ExcludeTag<M, Tag extends string> = M extends SerializableMachine<
    infer Requests,
    infer State,
    infer Input,
    infer InitErr,
    infer InitR,
    infer SR,
    infer XR
  > ? SerializableMachine<
      Exclude<Requests, { readonly _tag: Tag }>,
      State,
      Input,
      InitErr,
      InitR,
      SR,
      XR
    > :
    M extends Machine<infer Requests, infer State, infer Input, infer InitErr, infer InitR, infer XR> ? Machine<
        Exclude<Requests, { readonly _tag: Tag }>,
        State,
        Input,
        InitErr,
        InitR,
        XR
      > :
    never
}

/**
 * @since 1.0.0
 * @category models
 */
export interface Booted<M extends Machine.Any> {
  readonly [BootedTypeId]: BootedTypeId
  readonly machine: M
  readonly input: Machine.Input<M>
  readonly send: <Req extends Machine.Requests<M>>(request: Req) => Effect.Effect<
    Request.Success<Req>,
    Request.Error<Req>
  >
  readonly state: Effect.Effect<Machine.State<M>>
  readonly subscribe: Effect.Effect<Queue.Dequeue<Machine.State<M>>, never, Scope.Scope>
  readonly stream: Stream.Stream<Machine.State<M>>
  readonly streamWithInitial: Stream.Stream<Machine.State<M>>
  readonly join: Effect.Effect<never>
}

/**
 * @since 1.0.0
 * @category constructors
 */
export const make = <State>() =>
<
  Input,
  E,
  R,
  XR
>(
  initialize: Machine.Initialize<Input, State, XR, E, R>
): Machine<
  never,
  State,
  Input,
  E,
  Exclude<R, Scope.Scope>,
  XR
> => fromProcedures({ procedures: [] }, initialize as any)

/**
 * @since 1.0.0
 * @category constructors
 */
export const fromProcedures = <
  P extends ReadonlyArray<Procedure.Procedure<any, State, any>>,
  Input,
  State,
  InitErr,
  InitR,
  XR
>(
  options: {
    readonly procedures: P
    readonly internalTags?: ReadonlyArray<string> | undefined
  },
  initialize: Machine.Initialize<Input, State, XR, InitErr, InitR>
): Machine<
  Procedure.Procedure.InferRequest<P[number]>,
  State,
  Input,
  InitErr,
  Exclude<InitR | Procedure.Procedure.InferContext<P[number]>, Scope.Scope>,
  XR
> => ({
  [TypeId]: TypeId,
  initialize: initialize as any,
  procedures: options.procedures,
  internalTags: options.internalTags ?? [],
  pipe() {
    return pipeArguments(this, arguments)
  }
})
/**
 * @since 1.0.0
 * @category constructors
 */
export const fromProceduresSerializable = <
  State,
  IS,
  SR,
  Input,
  II,
  IR,
  P extends ReadonlyArray<Procedure.Procedure<any, State, any>>,
  InitErr,
  InitR,
  XR
>(
  options: {
    readonly schemaState: Schema.Schema<State, IS, SR>
    readonly schemaInput: Schema.Schema<Input, II, IR>
    readonly procedures: P
    readonly internalTags?: ReadonlyArray<string> | undefined
  },
  initialize: Machine.Initialize<Input, State, XR, InitErr, InitR>
): SerializableMachine<
  Procedure.Procedure.InferRequest<P[number]>,
  State,
  Input,
  InitErr,
  Exclude<InitR | Procedure.Procedure.InferContext<P[number]>, Scope.Scope>,
  SR | IR,
  XR
> => ({
  ...fromProcedures({
    procedures: options.procedures,
    internalTags: options.internalTags
  }, initialize),
  [SerializableTypeId]: SerializableTypeId,
  schemaInput: options.schemaInput as any,
  schemaState: options.schemaState as any
})

/**
 * @since 1.0.0
 * @category constructors
 */
export const makeSerializable: {
  <State, IS, SR, Input, II, IR, XR, InitErr, InitR>(
    options: {
      readonly state: Schema.Schema<State, IS, SR>
      readonly input: Schema.Schema<Input, II, IR>
    },
    initialize: Machine.Initialize<Input, State, XR, InitErr, InitR>
  ): SerializableMachine<never, State, Input, InitErr, Exclude<InitR, Scope.Scope>, SR | IR, XR>
  <State, IS, SR, XR, InitErr, InitR>(
    options: {
      readonly state: Schema.Schema<State, IS, SR>
    },
    initialize: Machine.Initialize<void, State, XR, InitErr, InitR>
  ): SerializableMachine<never, State, void, InitErr, Exclude<InitR, Scope.Scope>, SR, XR>
} = <State, IS, SR, Input, II, IR, XR, InitErr, InitR>(
  options: {
    readonly state: Schema.Schema<State, IS, SR>
    readonly input?: Schema.Schema<Input, II, IR>
  },
  initialize: Machine.Initialize<Input, State, XR, InitErr, InitR>
): SerializableMachine<
  never,
  State,
  Input,
  InitErr,
  InitR,
  SR | IR,
  XR
> =>
  fromProceduresSerializable({
    schemaState: options.state,
    schemaInput: options.input! ?? Schema.void,
    procedures: []
  }, initialize)

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
  ): <Requests extends Schema.TaggedRequest.Any, InitErr, R, XR>(
    self: Machine<Requests, State, Input, InitErr, R, XR>
  ) => SerializableMachine<
    Requests,
    State,
    Input,
    InitErr,
    R,
    SR | IR,
    XR
  >
  <
    Requests extends Schema.TaggedRequest.Any,
    State,
    Input,
    InitErr,
    R,
    XR,
    IS,
    SR,
    II,
    IR
  >(
    self: Machine<Requests, State, Input, InitErr, R, XR>,
    options: {
      readonly state: Schema.Schema<Types.NoInfer<State>, IS, SR>
      readonly input: Schema.Schema<Types.NoInfer<Input>, II, IR>
    }
  ): SerializableMachine<
    Requests,
    State,
    Input,
    InitErr,
    R,
    SR | IR,
    XR
  >
} = dual(2, <
  Requests extends Schema.TaggedRequest.Any,
  State,
  Input,
  InitErr,
  R,
  XR,
  IS,
  SR,
  II,
  IR
>(
  self: Machine<Requests, State, Input, InitErr, R, XR>,
  options: {
    readonly state: Schema.Schema<Types.NoInfer<State>, IS, SR>
    readonly input: Schema.Schema<Types.NoInfer<Input>, II, IR>
  }
): SerializableMachine<
  Requests,
  State,
  Input,
  InitErr,
  R,
  SR | IR,
  XR
> => ({
  ...self,
  [SerializableTypeId]: SerializableTypeId,
  schemaInput: options.input as any,
  schemaState: options.state as any
}))

/**
 * @since 1.0.0
 * @category procedures
 */
export const procedure: {
  <M extends Machine.Any, Req extends Schema.TaggedRequest.Any, I, ReqR, R>(
    schema: Schema.Schema<Req, I, ReqR>,
    tag: Req["_tag"],
    handler: Procedure.Handler<Req, Machine.State<M>, Machine.Requests<M>, R>
  ): (self: M) => Machine.AddRequest<M, Req, R>
  <
    M extends Machine.Any,
    Req extends Schema.TaggedRequest.Any,
    I,
    ReqR,
    R
  >(
    self: M,
    schema: Schema.Schema<Req, I, ReqR>,
    tag: Req["_tag"],
    handler: Procedure.Handler<Req, Machine.State<M>, Machine.Requests<M>, R>
  ): Machine.AddRequest<M, Req, R>
} = dual(
  4,
  <
    M extends Machine.Any,
    Req extends Schema.TaggedRequest.Any,
    I,
    ReqR,
    R
  >(
    self: M,
    schema: Schema.Schema<Req, I, ReqR>,
    tag: Req["_tag"],
    handler: (
      request: Req,
      ctx: Procedure.Procedure.Context<Machine.Requests<M> | Req, Machine.State<M>>
    ) => Effect.Effect<
      readonly [response: Request.Success<Req>, state: Machine.State<M>],
      Request.Error<Req>,
      R
    >
  ): Machine.AddRequest<M, Req, R> =>
    ({
      ...self,
      procedures: [...self.procedures, Procedure.make<any, any>()(schema, tag, handler)]
    }) as any
)

/**
 * @since 1.0.0
 * @category procedures
 */
export const markInternal: {
  <M extends Machine.Any, Tags extends ReadonlyArray<Machine.Requests<M>["_tag"]>>(
    ...tags: Tags
  ): (self: M) => Machine.ExcludeTag<M, Tags[number]>
  <M extends Machine.Any, Tags extends ReadonlyArray<Machine.Requests<M>["_tag"]>>(
    self: M,
    ...tags: Tags
  ): Machine.ExcludeTag<M, Tags[number]>
} = dual(
  (args) => isMachine(args[0]),
  <M extends Machine.Any, Tags extends ReadonlyArray<Machine.Requests<M>["_tag"]>>(
    self: M,
    ...tags: Tags
  ): Machine.ExcludeTag<M, Tags[number]> => ({ ...self, internalTags: [...self.internalTags, ...tags] }) as any
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
      options?: { readonly snapshot?: Machine.State<M>; readonly forever: boolean }
    ] :
    [
      input: Machine.Input<M>,
      options?: { readonly snapshot?: Machine.State<M>; readonly forever: boolean }
    ]
): Effect.Effect<Booted<M>, Machine.InitError<M>, Machine.Context<M> | Scope.Scope> => {
  const procedureMap: Record<string, Procedure.Procedure<any, Machine.State<M>, never>> = Object.fromEntries(
    self.procedures.map((p) => [p.tag, p])
  )
  const externalProcedures: Record<string, Procedure.Procedure<any, Machine.State<M>, never>> = Object.fromEntries(
    self.procedures.filter((p) => !self.internalTags.includes(p.tag)).map((p) => [p.tag, p])
  )

  return Effect.gen(function*(_) {
    const requests = yield* _(Queue.unbounded<[Schema.TaggedRequest.Any, Deferred.Deferred<any, any>]>())
    const pubsub = yield* _(Effect.acquireRelease(
      PubSub.unbounded<Machine.State<M>>(),
      PubSub.shutdown
    ))
    const fiberSet = yield* _(FiberSet.make<any, never>())

    let [state, initContext] = yield* _(self.initialize(input as Machine.Input<M>, options?.snapshot))

    const send = <R extends Machine.Requests<M>>(request: R) =>
      Effect.flatMap(
        Deferred.make<Request.Success<R>, Request.Error<R>>(),
        (deferred) =>
          Queue.offer(requests, [request, deferred]).pipe(
            Effect.zipRight(Deferred.await(deferred)),
            Effect.onInterrupt(() => Deferred.interrupt(deferred))
          )
      )

    const sendExternal = <R extends Machine.Requests<M>>(request: R) =>
      request._tag in externalProcedures ? send(request) : Effect.die(`Unknown request: ${request._tag}`)

    const publishState = (newState: Machine.State<M>) => {
      if (state !== newState) {
        state = newState
        return PubSub.publish(pubsub, newState)
      }
      return Effect.unit
    }

    const fork = <A, E, R>(effect: Effect.Effect<A, E, R>) => FiberSet.run(fiberSet, Effect.orDie(effect))

    const forkWith = <A, E, R>(state: Machine.State<M>, effect: Effect.Effect<A, E, R>) =>
      Effect.as(FiberSet.run(fiberSet, Effect.orDie(effect)), [void 0, state] as const)

    const forkWithState = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
      Effect.map(FiberSet.run(fiberSet, Effect.orDie(effect)), () => [void 0, state] as const)

    const context: Procedure.Procedure.Context<Machine.Requests<M>, Machine.State<M>> = {
      send,
      fork,
      forkWith,
      forkWithState
    }

    const run = pipe(
      Queue.take(requests),
      Effect.flatMap(([request, deferred]) =>
        Effect.flatMap(Deferred.isDone(deferred), (done) => {
          if (done) return Effect.unit
          const procedure = procedureMap[request._tag]
          return Effect.matchEffect(Effect.provide(procedure.handler(request, state, context), initContext), {
            onFailure: (e) => Deferred.fail(deferred, e),
            onSuccess: ([response, newState]) =>
              Effect.zipRight(
                publishState(newState),
                Deferred.succeed(deferred, response)
              )
          })
        })
      ),
      Effect.forever,
      Effect.raceFirst(FiberSet.join(fiberSet))
    )

    const fiber = yield* _(
      options?.forever ?
        pipe(
          run,
          Effect.catchAllCause((cause) => Effect.log("Machine got defect", cause)),
          Effect.zipRight(FiberSet.clear(fiberSet)),
          Effect.zipRight(self.initialize(input as Machine.Input<M>, options?.snapshot)),
          Effect.tap(([newState, newContext]) => {
            initContext = newContext
            return publishState(newState)
          }),
          Effect.zipRight(Queue.takeAll(requests)),
          Effect.forever,
          Effect.orDie
        ) :
        run,
      Effect.forkScoped,
      Effect.interruptible
    )

    return identity<Booted<M>>({
      [BootedTypeId]: BootedTypeId,
      machine: self,
      input: input!,
      join: Fiber.join(fiber),
      state: Effect.sync(() => state),
      subscribe: PubSub.subscribe(pubsub),
      stream: Stream.fromPubSub(pubsub),
      streamWithInitial: Stream.concat(
        Stream.sync(() => state),
        Stream.fromPubSub(pubsub)
      ),
      send: sendExternal
    })
  })
}

/**
 * @since 1.0.0
 * @category runtime
 */
export const snapshot = <
  Requests extends Schema.TaggedRequest.Any,
  State,
  Input,
  InitErr,
  R,
  SR,
  XR
>(
  self: Booted<
    SerializableMachine<
      Requests,
      State,
      Input,
      InitErr,
      R,
      SR,
      XR
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
  M extends Machine.AnySerializible
>(
  self: M,
  snapshot: readonly [input: unknown, state: unknown],
  options?: { readonly forever: boolean }
): Effect.Effect<Booted<M>, ParseResult.ParseError, Machine.ContextWithSchema<M>> =>
  Effect.flatMap(
    Schema.decodeUnknown(Schema.tuple(self.schemaInput, self.schemaState))(snapshot),
    ([input, snapshot]) => (boot as any)(self, input, { snapshot, forever: options?.forever })
  )
