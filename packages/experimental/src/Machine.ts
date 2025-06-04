/**
 * @since 1.0.0
 */
import * as Arr from "effect/Array"
import * as Cause from "effect/Cause"
import * as Context from "effect/Context"
import * as Deferred from "effect/Deferred"
import * as Effect from "effect/Effect"
import * as Fiber from "effect/Fiber"
import * as FiberMap from "effect/FiberMap"
import * as FiberRef from "effect/FiberRef"
import * as FiberRefs from "effect/FiberRefs"
import * as FiberSet from "effect/FiberSet"
import { dual, identity, pipe } from "effect/Function"
import { globalValue } from "effect/GlobalValue"
import * as Option from "effect/Option"
import type * as ParseResult from "effect/ParseResult"
import type { Pipeable } from "effect/Pipeable"
import { pipeArguments } from "effect/Pipeable"
import * as PubSub from "effect/PubSub"
import * as Queue from "effect/Queue"
import * as Readable from "effect/Readable"
import type { Request } from "effect/Request"
import type * as Schedule from "effect/Schedule"
import * as Schema from "effect/Schema"
import type * as Scope from "effect/Scope"
import * as Stream from "effect/Stream"
import * as Subscribable from "effect/Subscribable"
import * as Tracer from "effect/Tracer"
import * as Procedure from "./Machine/Procedure.js"
import type { ProcedureList } from "./Machine/ProcedureList.js"
import type { SerializableProcedureList } from "./Machine/SerializableProcedureList.js"

/**
 * @since 1.0.0
 * @category procedures
 */
export * as procedures from "./Machine/ProcedureList.js"

/**
 * @since 1.0.0
 * @category procedures
 */
export * as serializable from "./Machine/SerializableProcedureList.js"

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
export const TypeId: unique symbol = Symbol.for("@effect/experimental/Machine")

/**
 * @since 1.0.0
 * @category type ids
 */
export type TypeId = typeof TypeId

/**
 * @since 1.0.0
 * @category models
 */
export interface Machine<
  State,
  Public extends Procedure.TaggedRequest.Any,
  Private extends Procedure.TaggedRequest.Any,
  Input,
  InitErr,
  R
> extends Pipeable {
  readonly [TypeId]: TypeId
  readonly initialize: Machine.Initialize<Input, State, Public, Private, R, InitErr, R>
  readonly retryPolicy: Schedule.Schedule<unknown, InitErr | MachineDefect, R> | undefined
}

/**
 * @since 1.0.0
 * @category type ids
 */
export const SerializableTypeId: unique symbol = Symbol.for("@effect/experimental/Machine/Serializable")

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
  Public extends Schema.TaggedRequest.All,
  Private extends Schema.TaggedRequest.All,
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
export const ActorTypeId: unique symbol = Symbol.for("@effect/experimental/Machine/Actor")

/**
 * @since 1.0.0
 * @category type ids
 */
export type ActorTypeId = typeof ActorTypeId

/**
 * @since 1.0.0
 * @category errors
 */
export class MachineDefect extends Schema.TaggedError<MachineDefect>()("MachineDefect", {
  cause: Schema.Defect
}) {
  /**
   * @since 1.0.0
   */
  static wrap<A, E, R>(effect: Effect.Effect<A, E, R>): Effect.Effect<A, MachineDefect, R> {
    return Effect.catchAllCause(
      Effect.orDie(effect),
      (cause) => Effect.fail(new MachineDefect({ cause: Cause.squash(cause) }))
    )
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
    Public extends Procedure.TaggedRequest.Any,
    Private extends Procedure.TaggedRequest.Any,
    R,
    E,
    InitR
  > = (
    input: Input,
    previousState?: State | undefined
  ) => Effect.Effect<ProcedureList<State, Public, Private, R>, E, InitR>

  /**
   * @since 1.0.0
   * @category models
   */
  export type InitializeSerializable<
    Input,
    State,
    Public extends Schema.TaggedRequest.All,
    Private extends Schema.TaggedRequest.All,
    R,
    E,
    InitR
  > = (
    input: Input,
    previousState?: State | undefined
  ) => Effect.Effect<SerializableProcedureList<State, Public, Private, R>, E, InitR>

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
export interface Actor<M extends Machine.Any> extends Subscribable.Subscribable<Machine.State<M>> {
  readonly [ActorTypeId]: ActorTypeId
  readonly machine: M
  readonly input: Machine.Input<M>
  readonly send: <Req extends Machine.Public<M>>(request: Req) => Effect.Effect<
    Request.Success<Req>,
    Request.Error<Req>
  >
  readonly join: Effect.Effect<never, Machine.InitError<M> | MachineDefect>
}

const ActorProto = {
  [ActorTypeId]: ActorTypeId,
  [Readable.TypeId]: Readable.TypeId,
  [Subscribable.TypeId]: Subscribable.TypeId,
  pipe() {
    return pipeArguments(this, arguments)
  }
}

/**
 * @since 1.0.0
 * @category models
 */
export interface SerializableActor<M extends Machine.Any> extends Actor<M> {
  readonly sendUnknown: (request: unknown) => Effect.Effect<
    Schema.ExitEncoded<unknown, unknown, unknown>,
    ParseResult.ParseError
  >
}

/**
 * @since 1.0.0
 * @category constructors
 */
export const make: {
  <State, Public extends Procedure.TaggedRequest.Any, Private extends Procedure.TaggedRequest.Any, InitErr, R>(
    initialize: Effect.Effect<ProcedureList<State, Public, Private, R>, InitErr, R>
  ): Machine<State, Public, Private, void, InitErr, Exclude<R, Scope.Scope | MachineContext>>
  <State, Public extends Procedure.TaggedRequest.Any, Private extends Procedure.TaggedRequest.Any, Input, InitErr, R>(
    initialize: Machine.Initialize<Input, State, Public, Private, R, InitErr, R>
  ): Machine<State, Public, Private, Input, InitErr, Exclude<R, Scope.Scope | MachineContext>>
} = <State, Public extends Procedure.TaggedRequest.Any, Private extends Procedure.TaggedRequest.Any, Input, InitErr, R>(
  initialize:
    | Machine.Initialize<Input, State, Public, Private, R, InitErr, R>
    | Effect.Effect<ProcedureList<State, Public, Private, R>, InitErr, R>
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
export const makeWith = <State, Input = void>(): {
  <Public extends Procedure.TaggedRequest.Any, Private extends Procedure.TaggedRequest.Any, InitErr, R>(
    initialize: Effect.Effect<ProcedureList<State, Public, Private, R>, InitErr, R>
  ): Machine<State, Public, Private, void, InitErr, Exclude<R, Scope.Scope | MachineContext>>
  <Public extends Procedure.TaggedRequest.Any, Private extends Procedure.TaggedRequest.Any, InitErr, R>(
    initialize: Machine.Initialize<Input, State, Public, Private, R, InitErr, R>
  ): Machine<State, Public, Private, Input, InitErr, Exclude<R, Scope.Scope | MachineContext>>
} => make

/**
 * @since 1.0.0
 * @category constructors
 */
export const makeSerializable: {
  <
    State,
    IS,
    RS,
    Public extends Schema.TaggedRequest.All,
    Private extends Schema.TaggedRequest.All,
    InitErr,
    R
  >(
    options: {
      readonly state: Schema.Schema<State, IS, RS>
      readonly input?: undefined
    },
    initialize:
      | Effect.Effect<SerializableProcedureList<State, Public, Private, R>, InitErr, R>
      | Machine.InitializeSerializable<void, State, Public, Private, R, InitErr, R>
  ): SerializableMachine<State, Public, Private, void, InitErr, Exclude<R, Scope.Scope | MachineContext>, RS>
  <
    State,
    IS,
    RS,
    Input,
    II,
    RI,
    Public extends Schema.TaggedRequest.All,
    Private extends Schema.TaggedRequest.All,
    InitErr,
    R
  >(
    options: {
      readonly state: Schema.Schema<State, IS, RS>
      readonly input: Schema.Schema<Input, II, RI>
    },
    initialize: Machine.InitializeSerializable<Input, State, Public, Private, R, InitErr, R>
  ): SerializableMachine<State, Public, Private, Input, InitErr, Exclude<R, Scope.Scope | MachineContext>, RS | RI>
} = <
  State,
  IS,
  RS,
  Input,
  II,
  RI,
  Public extends Schema.TaggedRequest.All,
  Private extends Schema.TaggedRequest.All,
  InitErr,
  R
>(
  options: {
    readonly state: Schema.Schema<State, IS, RS>
    readonly input?: Schema.Schema<Input, II, RI> | undefined
  },
  initialize:
    | Machine.InitializeSerializable<Input, State, Public, Private, R, InitErr, R>
    | Effect.Effect<SerializableProcedureList<State, Public, Private, R>, InitErr, R>
): SerializableMachine<State, Public, Private, Input, InitErr, Exclude<R, Scope.Scope | MachineContext>, RS | RI> => (({
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
}) as any)

/**
 * @since 1.0.0
 * @category combinators
 */
export const retry: {
  <M extends Machine.Any, Out, In extends Machine.InitError<M> | MachineDefect, R>(
    policy: Schedule.Schedule<Out, In, R>
  ): (self: M) => Machine.AddContext<M, R>
  <M extends Machine.Any, Out, In extends Machine.InitError<M> | MachineDefect, R>(
    self: M,
    policy: Schedule.Schedule<Out, In, R>
  ): Machine.AddContext<M, R>
} = dual(2, <M extends Machine.Any, Out, In extends Machine.InitError<M> | MachineDefect, R>(
  self: M,
  retryPolicy: Schedule.Schedule<Out, In, R>
): Machine.AddContext<M, R> => (({
  ...self,
  retryPolicy
}) as any))

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
): Effect.Effect<
  M extends { readonly [SerializableTypeId]: SerializableTypeId } ? SerializableActor<M> : Actor<M>,
  never,
  Machine.Context<M> | Scope.Scope
> =>
  Effect.gen(function*() {
    const context = yield* Effect.context<Machine.Context<M>>()
    const requests = yield* Queue.unbounded<
      readonly [
        Procedure.TaggedRequest.Any,
        Deferred.Deferred<any, any>,
        Tracer.AnySpan | undefined,
        addSpans: boolean
      ]
    >()
    const pubsub = yield* Effect.acquireRelease(
      PubSub.unbounded<Machine.State<M>>(),
      PubSub.shutdown
    )
    const latch = yield* Deferred.make<void>()

    let currentState: Machine.State<M> = undefined as any
    let runState: {
      readonly identifier: string
      readonly publicTags: Set<string>
      readonly decodeRequest: (u: unknown) => Effect.Effect<Machine.Public<M>, ParseResult.ParseError>
    } = {
      identifier: "Unknown",
      publicTags: new Set<string>(),
      decodeRequest: undefined as any
    }

    const requestContext = <R extends Machine.Public<M>>(request: R) =>
      Effect.sync(() => {
        const fiber = Option.getOrThrow(Fiber.getCurrentFiber())
        const fiberRefs = fiber.getFiberRefs()
        const context = FiberRefs.getOrDefault(fiberRefs, FiberRef.currentContext)

        const deferred = Deferred.unsafeMake<Request.Success<R>, Request.Error<R>>(fiber.id())
        const span: Tracer.AnySpan | undefined = context.unsafeMap.get(Tracer.ParentSpan.key)
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
            },
            kind: "client",
            captureStackTrace: false
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
            },
            kind: "client",
            captureStackTrace: false
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
        runState.decodeRequest(u).pipe(
          Effect.flatMap((req) =>
            Effect.flatMap(
              Effect.exit(send(req)),
              (exit) => Schema.serializeExit(req, exit)
            )
          ),
          Effect.provide(context)
        )
      ) as Effect.Effect<Schema.ExitEncoded<unknown, unknown, unknown>, ParseResult.ParseError>

    const publishState = (newState: Machine.State<M>) => {
      if (currentState !== newState) {
        currentState = newState
        return PubSub.publish(pubsub, newState)
      }
      return Effect.void
    }

    const run = Effect.gen(function*() {
      const fiberSet = yield* FiberSet.make<any, MachineDefect>()
      const fiberMap = yield* FiberMap.make<string, any, MachineDefect>()

      const fork = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
        Effect.asVoid(FiberSet.run(fiberSet, MachineDefect.wrap(effect)))
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
        Effect.asVoid(
          FiberMap.run(fiberMap, id, MachineDefect.wrap(effect))
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
        Effect.asVoid(FiberMap.run(fiberMap, id, MachineDefect.wrap(effect), { onlyIfMissing: true })))

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

      const contextProto: Procedure.Procedure.ContextProto<Machine.Public<M>, Machine.State<M>> = {
        sendAwait: send,
        send: sendIgnore,
        unsafeSend: sendIgnore as any,
        unsafeSendAwait: send as any,
        fork,
        forkWith,
        forkOne,
        forkOneWith,
        forkReplace,
        forkReplaceWith
      }

      const procedures = yield* pipe(
        self.initialize(input, currentState ?? options?.previousState) as Effect.Effect<
          SerializableProcedureList<Machine.State<M>, Machine.Public<M>, Machine.Private<M>, never>,
          Machine.InitError<M>
        >,
        Effect.provideService(MachineContext, contextProto)
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
        decodeRequest: Schema.decodeUnknown(
          Schema.Union(
            ...Arr.filter(
              procedures.public,
              Procedure.isSerializable
            ).map((p) => p.schema)
          )
        )
      }
      yield* publishState(procedures.initialState)
      yield* Deferred.succeed(latch, void 0)

      const process = pipe(
        Queue.take(requests),
        Effect.flatMap(([request, deferred, span, addSpan]) =>
          Effect.flatMap(Deferred.isDone(deferred), (done) => {
            if (done) {
              return Effect.void
            }

            const procedure = procedureMap[request._tag]
            if (procedure === undefined) {
              return Deferred.die(deferred, `Unknown request ${request._tag}`)
            }
            const context = Object.create(contextProto)
            context.state = currentState
            context.request = request
            context.deferred = deferred

            let handler = Effect.matchCauseEffect(
              procedure.handler(context),
              {
                onFailure: (e) => {
                  if (Cause.isFailure(e)) {
                    return Deferred.failCause(deferred, e)
                  }
                  // defects kill the actor
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
              }
            )
            if (addSpan) {
              handler = Effect.withSpan(handler, `Machine.process ${request._tag}`, {
                kind: "server",
                parent: span,
                attributes: {
                  "effect.machine": runState.identifier
                },
                captureStackTrace: false
              })
            } else if (span !== undefined) {
              handler = Effect.provideService(handler, Tracer.ParentSpan, span)
            }

            return handler
          })
        ),
        Effect.forever,
        Effect.provideService(MachineContext, contextProto)
      )

      yield* pipe(
        Effect.all([
          process,
          FiberSet.join(fiberSet),
          FiberMap.join(fiberMap)
        ], { concurrency: "unbounded", discard: true }),
        Effect.onExit((exit) => {
          if (exit._tag === "Success") return Effect.die("absurd")
          return Effect.flatMap(
            Queue.takeAll(requests),
            Effect.forEach(([, deferred]) => Deferred.failCause(deferred, exit.cause))
          )
        }),
        Effect.tapErrorCause((cause) =>
          FiberRef.getWith(
            FiberRef.unhandledErrorLogLevel,
            Option.match({
              onNone: () => Effect.void,
              onSome: (level) =>
                Effect.log(`Unhandled Machine (${runState.identifier}) failure`, cause).pipe(
                  Effect.locally(FiberRef.currentLogLevel, level)
                )
            })
          )
        ),
        Effect.catchAllDefect((cause) => Effect.fail(new MachineDefect({ cause })))
      )
    }).pipe(Effect.scoped) as Effect.Effect<
      never,
      MachineDefect | Machine.InitError<M>
    >

    const fiber = yield* pipe(
      run,
      self.retryPolicy ?
        Effect.retry(self.retryPolicy) :
        identity,
      Effect.forkScoped,
      Effect.interruptible
    )

    yield* Deferred.await(latch)

    return identity<SerializableActor<M>>(Object.assign(Object.create(ActorProto), {
      machine: self,
      input: input!,
      get: Effect.sync(() => currentState),
      changes: Stream.concat(
        Stream.sync(() => currentState),
        Stream.fromPubSub(pubsub)
      ),
      send: sendExternal,
      sendUnknown,
      join: Fiber.join(fiber)
    })) as any
  })

/**
 * @since 1.0.0
 * @category runtime
 */
export const snapshot = <
  State,
  Public extends Schema.TaggedRequest.All,
  Private extends Schema.TaggedRequest.All,
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
    Effect.flatMap(self.get, Schema.encode(self.machine.schemaState))
  )

/**
 * @since 1.0.0
 * @category runtime
 */
export const restore = <
  State,
  Public extends Schema.TaggedRequest.All,
  Private extends Schema.TaggedRequest.All,
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
    Schema.decodeUnknown(Schema.Tuple(self.schemaInput, self.schemaState))(snapshot),
    ([input, previousState]) => (boot as any)(self, input, { previousState })
  )
