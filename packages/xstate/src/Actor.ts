/**
 * @since 1.0.0
 */
import * as Schema from "@effect/schema/Schema"
import * as Serializable from "@effect/schema/Serializable"
import type * as Cause from "effect/Cause"
import * as Channel from "effect/Channel"
import * as Chunk from "effect/Chunk"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import type * as Fiber from "effect/Fiber"
import { identity } from "effect/Function"
import * as Queue from "effect/Queue"
import * as Runtime from "effect/Runtime"
import type * as Scope from "effect/Scope"
import * as Stream from "effect/Stream"
import {
  type ActorLogic,
  type ActorOptions,
  type ActorRefFrom,
  type ActorSystem as XstateSystem,
  type AnyActorLogic,
  type AnyEventObject,
  type ConditionalRequired,
  createActor,
  type EventFromLogic,
  type InputFrom,
  type IsNotNever,
  type SnapshotFrom
} from "xstate"
import * as Snapshot from "./Snapshot.js"

/**
 * @since 1.0.0
 * @category tags
 */
export class ActorSystem extends Context.Tag("xstate/ActorSystem")<
  ActorSystem,
  XstateSystem<any>
>() {}

const XSTATE_EFFECT_SUCCEED = "xstate.effect.succeed" as const
const XSTATE_EFFECT_FAIL = "xstate.effect.fail" as const

/**
 * @since 1.0.0
 * @category models
 */
export type EffectSnapshot<A, E = never> = {
  status: "active"
  output: undefined
  error: undefined
  input: unknown
  _effect: Effect.Effect<A, E, unknown>
  _fiber: Fiber.RuntimeFiber<A, E> | undefined
} | {
  status: "done"
  output: A
  error: undefined
  input: unknown
  _effect: Effect.Effect<A, E, unknown>
  _fiber: undefined
} | {
  status: "error"
  output: undefined
  error: Cause.Cause<E>
  input: unknown
  _effect: Effect.Effect<A, E, unknown>
  _fiber: undefined
} | {
  status: "stopped"
  output: undefined
  error: undefined
  input: unknown
  _effect: Effect.Effect<A, E, unknown>
  _fiber: undefined
}

/**
 * @since 1.0.0
 * @category models
 */
export type EffectSnapshotPersisted<A, E = never, In = unknown> = Snapshot.WithInput<A, Cause.Cause<E>, In>

/**
 * @since 1.0.0
 * @category models
 */
export type EffectActorLogic<A, E = never, In = unknown> = ActorLogic<
  EffectSnapshot<A, E>,
  AnyEventObject,
  In
>

/**
 * @since 1.0.0
 * @category models
 */
export type EffectActorRef<A, E = never> = ActorRefFrom<
  EffectActorLogic<A, E>
>

/**
 * Create an xstate actor from an Effect.
 *
 * @since 1.0.0
 * @category constructors
 */
export const fromEffect = <A, E = never, R = never, In = unknown>(
  effectCreator: (
    /**
     * The parent actor of the effect actor
     */
    ref: EffectActorRef<A, E>,
    /**
     * The input to the effect actor
     */
    input: In
  ) => Effect.Effect<A, E, R>
): Effect.Effect<EffectActorLogic<A, E, In>, never, Exclude<R, ActorSystem>> =>
  Effect.map(
    Effect.runtime<Exclude<R, ActorSystem>>(),
    (runtime) => {
      const runFork = Runtime.runFork(runtime)

      return identity<EffectActorLogic<A, E, In>>({
        config: effectCreator,
        transition(state, event) {
          if (state.status !== "active") {
            return state
          }

          switch (event.type) {
            case XSTATE_EFFECT_SUCCEED: {
              return {
                ...state,
                status: "done",
                output: event.value,
                error: undefined,
                _fiber: undefined
              }
            }
            case XSTATE_EFFECT_FAIL: {
              return {
                ...state,
                status: "error",
                output: undefined,
                error: event.cause,
                _fiber: undefined
              }
            }
            case "xstate.stop": {
              if (state._fiber !== undefined) {
                state._fiber.unsafeInterruptAsFork(state._fiber.id())
              }
              return {
                ...state,
                status: "stopped",
                output: undefined,
                error: undefined,
                _fiber: undefined
              }
            }
            default: {
              return state
            }
          }
        },
        getInitialSnapshot({ self, system }, input) {
          return {
            status: "active",
            output: undefined,
            error: undefined,
            input,
            _effect: Effect.provideService(effectCreator(self, input), ActorSystem, system),
            _fiber: undefined
          }
        },
        start(state, { self }) {
          if (!(state.status === "active" && state._fiber === undefined)) {
            return
          }
          state._fiber = runFork(state._effect as Effect.Effect<A, E, never>)
          state._fiber.addObserver((exit) => {
            if (self.getSnapshot().status !== "active") {
              return
            }

            if (Exit.isSuccess(exit)) {
              self.send({
                type: XSTATE_EFFECT_SUCCEED,
                value: exit.value
              })
            } else {
              self.send({
                type: XSTATE_EFFECT_FAIL,
                cause: exit.cause
              })
            }
          })
        },
        getPersistedSnapshot({ _effect, _fiber, ...state }) {
          return state
        },
        restoreSnapshot(state, { self, system }) {
          return {
            ...state,
            _effect: Effect.provideService(effectCreator(self, (state as any).input), ActorSystem, system),
            _fiber: undefined
          } as any
        }
      })
    }
  )

const XSTATE_STREAM_EMIT = "xstate.effect-stream.emit" as const
const XSTATE_STREAM_FAIL = "xstate.effect-stream.fail" as const
const XSTATE_STREAM_DONE = "xstate.effect-stream.done" as const

/**
 * @since 1.0.0
 * @category models
 */
export type StreamSnapshot<A, E = never> = {
  status: "active"
  context: A | undefined
  output: undefined
  error: undefined
  input: unknown
  _stream: Stream.Stream<A, E, unknown>
  _fiber: Fiber.RuntimeFiber<void, E> | undefined
} | {
  status: "done"
  context: A | undefined
  output: void
  error: undefined
  input: unknown
  _stream: Stream.Stream<A, E, unknown>
  _fiber: undefined
} | {
  status: "error"
  context: A | undefined
  output: undefined
  error: Cause.Cause<E>
  input: unknown
  _stream: Stream.Stream<A, E, unknown>
  _fiber: undefined
} | {
  status: "stopped"
  context: A | undefined
  output: undefined
  error: undefined
  input: unknown
  _stream: Stream.Stream<A, E, unknown>
  _fiber: undefined
}

/**
 * @since 1.0.0
 * @category models
 */
export type StreamSnapshotPersisted<A, E = never, In = unknown> = Snapshot.WithContextInput<
  A | undefined,
  Cause.Cause<E>,
  In
>

/**
 * @since 1.0.0
 * @category models
 */
export type StreamActorLogic<A, E = never, In = unknown> = ActorLogic<
  StreamSnapshot<A, E>,
  AnyEventObject,
  In
>

/**
 * @since 1.0.0
 * @category models
 */
export type StreamActorRef<A, E = never> = ActorRefFrom<
  StreamActorLogic<A, E>
>

/**
 * Create an xstate actor from a Stream.
 *
 * @since 1.0.0
 * @category constructors
 */
export const fromStream = <A, E = never, R = never, In = unknown>(
  streamCreator: (
    /**
     * The parent actor of the stream actor
     */
    ref: StreamActorRef<A, E>,
    /**
     * The input to the stream actor
     */
    input: In
  ) => Stream.Stream<A, E, R>
): Effect.Effect<StreamActorLogic<A, E, In>, never, Exclude<R, ActorSystem>> =>
  Effect.map(
    Effect.runtime<Exclude<R, ActorSystem>>(),
    (runtime) => {
      const runFork = Runtime.runFork(runtime)

      return identity<StreamActorLogic<A, E, In>>({
        config: streamCreator,
        transition(state, event) {
          if (state.status !== "active") {
            return state
          }

          switch (event.type) {
            case XSTATE_STREAM_EMIT: {
              return {
                ...state,
                status: "active",
                context: event.value,
                output: undefined,
                error: undefined
              }
            }
            case XSTATE_STREAM_FAIL: {
              return {
                ...state,
                status: "error",
                output: undefined,
                error: event.cause,
                _fiber: undefined
              }
            }
            case XSTATE_STREAM_DONE: {
              return {
                ...state,
                status: "done",
                output: void 0,
                error: undefined,
                _fiber: undefined
              }
            }
            case "xstate.stop": {
              if (state._fiber !== undefined) {
                state._fiber.unsafeInterruptAsFork(state._fiber.id())
              }
              return {
                ...state,
                status: "stopped",
                output: undefined,
                error: undefined,
                _fiber: undefined
              }
            }
            default: {
              return state
            }
          }
        },
        getInitialSnapshot({ self, system }, input) {
          return {
            status: "active",
            context: undefined,
            output: undefined,
            error: undefined,
            input,
            _stream: Stream.provideService(streamCreator(self, input), ActorSystem, system),
            _fiber: undefined
          }
        },
        start(state, { self }) {
          if (!(state.status === "active" && state._fiber === undefined)) {
            return
          }
          state._fiber = runFork(
            Stream.runForEach(state._stream as Stream.Stream<A, E, never>, (value) =>
              Effect.sync(() => {
                self.send({ type: XSTATE_STREAM_EMIT, value })
              }))
          )
          state._fiber.addObserver((exit) => {
            if (self.getSnapshot().status !== "active") {
              return
            }

            if (Exit.isSuccess(exit)) {
              self.send({ type: XSTATE_STREAM_DONE })
            } else {
              self.send({ type: XSTATE_STREAM_FAIL, cause: exit.cause })
            }
          })
        },
        getPersistedSnapshot({ _fiber, _stream, ...state }) {
          return state
        },
        restoreSnapshot(state, { self, system }) {
          return {
            ...state,
            _stream: Stream.provideService(streamCreator(self, (state as any).input), ActorSystem, system),
            _fiber: undefined
          } as any
        }
      })
    }
  )

/**
 * @since 1.0.0
 * @category schemas
 */
export const schemaSnapshot = <IA, A, IE, E, IIn, In>(
  success: Schema.Schema<A, IA>,
  failure: Schema.Schema<E, IE>,
  input: Schema.Schema<In, IIn>
): Schema.Schema<
  EffectSnapshotPersisted<A, E, In>,
  | { readonly status: "active"; readonly output: undefined; readonly error: undefined; readonly input: IIn }
  | { readonly status: "done"; readonly output: IA; readonly error: undefined; readonly input: IIn }
  | { readonly status: "error"; readonly output: undefined; readonly error: Schema.CauseFrom<IE>; readonly input: IIn }
  | { readonly status: "stopped"; readonly output: undefined; readonly error: undefined; readonly input: IIn }
> =>
  Schema.union(
    Schema.struct({
      status: Schema.literal("active"),
      output: Schema.undefined,
      error: Schema.undefined,
      input
    }),
    Schema.struct({
      status: Schema.literal("done"),
      output: success,
      error: Schema.undefined,
      input
    }),
    Schema.struct({
      status: Schema.literal("error"),
      output: Schema.undefined,
      error: Schema.cause<E, IE, never, never>({ error: failure }),
      input
    }),
    Schema.struct({
      status: Schema.literal("stopped"),
      output: Schema.undefined,
      error: Schema.undefined,
      input
    })
  )

/**
 * @since 1.0.0
 * @category schemas
 */
export const schemaSnapshotContext = <IA, A, IE, E, IIn, In>(
  success: Schema.Schema<A, IA>,
  failure: Schema.Schema<E, IE>,
  input: Schema.Schema<In, IIn>
): Schema.Schema<
  StreamSnapshotPersisted<A, E, In>,
  {
    readonly status: "active"
    readonly output: undefined
    readonly error: undefined
    readonly input: IIn
    readonly context: IA | undefined
  } | {
    readonly status: "done"
    readonly output: void
    readonly error: undefined
    readonly input: IIn
    readonly context: IA | undefined
  } | {
    readonly status: "error"
    readonly output: undefined
    readonly error: Schema.CauseFrom<IE>
    readonly input: IIn
    readonly context: IA | undefined
  } | {
    readonly status: "stopped"
    readonly output: undefined
    readonly error: undefined
    readonly input: IIn
    readonly context: IA | undefined
  },
  never
> => {
  const context = Schema.union(Schema.undefined, success)
  return Schema.union(
    Schema.struct({
      status: Schema.literal("active"),
      context,
      output: Schema.undefined,
      error: Schema.undefined,
      input
    }),
    Schema.struct({
      status: Schema.literal("done"),
      context,
      output: Schema.void,
      error: Schema.undefined,
      input
    }),
    Schema.struct({
      status: Schema.literal("error"),
      context,
      output: Schema.undefined,
      error: Schema.cause<E, IE, never, never>({ error: failure }),
      input
    }),
    Schema.struct({
      status: Schema.literal("stopped"),
      context,
      output: Schema.undefined,
      error: Schema.undefined,
      input
    })
  )
}

/**
 * Create an xstate actor from an Effect. The given schema is used to encode and decode the
 * persisted snapshots.
 *
 * Note: at this stage async schema transformations are not supported.
 *
 * @since 1.0.0
 * @category constructors
 */
export const fromEffectSchema = <In extends Schema.TaggedRequest.Any, I, R>(
  schema: Schema.Schema<In, I>,
  effectCreator: (
    /**
     * The parent actor of the effect actor
     */
    ref: EffectActorRef<
      Schema.Schema.To<In[typeof Serializable.symbolResult]["Success"]>,
      Schema.Schema.To<In[typeof Serializable.symbolResult]["Failure"]>
    >,
    /**
     * The input to the effect actor
     */
    input: In
  ) => Effect.Effect<
    Schema.Schema.To<In[typeof Serializable.symbolResult]["Success"]>,
    Schema.Schema.To<In[typeof Serializable.symbolResult]["Failure"]>,
    R
  >
): Effect.Effect<
  EffectActorLogic<
    Schema.Schema.To<In[typeof Serializable.symbolResult]["Success"]>,
    Schema.Schema.To<In[typeof Serializable.symbolResult]["Failure"]>,
    In
  >,
  never,
  R
> => {
  const decodeInput = Schema.decodeUnknownSync(Schema.struct({
    input: schema
  }))
  return Effect.map(
    fromEffect(effectCreator),
    (effectLogic): EffectActorLogic<
      Schema.Schema.To<In[typeof Serializable.symbolResult]["Success"]>,
      Schema.Schema.To<In[typeof Serializable.symbolResult]["Failure"]>,
      In
    > => ({
      ...effectLogic,
      getPersistedSnapshot(snapshot) {
        return Schema.encodeUnknownSync(schemaSnapshot(
          Serializable.successSchema(snapshot.input as any),
          Serializable.failureSchema(snapshot.input as any),
          schema
        ))(snapshot)
      },
      restoreSnapshot(snapshot, { self, system }) {
        const { input } = decodeInput(snapshot)
        const result = Schema.decodeUnknownSync(schemaSnapshot(
          Serializable.successSchema(input as any),
          Serializable.failureSchema(input as any),
          schema
        ))(snapshot)
        return {
          ...result,
          _effect: Effect.provideService(effectCreator(self, input), ActorSystem, system),
          _fiber: undefined
        } as any
      }
    })
  )
}

/**
 * Create an xstate actor from a Stream. The given schema is used to encode and decode the
 * persisted snapshots.
 *
 * Note: at this stage async schema transformations are not supported.
 *
 * @since 1.0.0
 * @category constructors
 */
export const fromStreamSchema = <In extends Schema.TaggedRequest.Any, I, R>(
  schema: Schema.Schema<In, I>,
  streamCreator: (
    /**
     * The parent actor of the effect actor
     */
    ref: StreamActorRef<
      Schema.Schema.To<In[typeof Serializable.symbolResult]["Success"]>,
      Schema.Schema.To<In[typeof Serializable.symbolResult]["Failure"]>
    >,
    /**
     * The input to the effect actor
     */
    input: In
  ) => Stream.Stream<
    Schema.Schema.To<In[typeof Serializable.symbolResult]["Success"]>,
    Schema.Schema.To<In[typeof Serializable.symbolResult]["Failure"]>,
    R
  >
): Effect.Effect<
  StreamActorLogic<
    Schema.Schema.To<In[typeof Serializable.symbolResult]["Success"]>,
    Schema.Schema.To<In[typeof Serializable.symbolResult]["Failure"]>,
    In
  >,
  never,
  R
> => {
  const decodeInput = Schema.decodeUnknownSync(Schema.struct({
    input: schema
  }))
  return Effect.map(
    fromStream(streamCreator),
    (logic): StreamActorLogic<
      Schema.Schema.To<In[typeof Serializable.symbolResult]["Success"]>,
      Schema.Schema.To<In[typeof Serializable.symbolResult]["Failure"]>,
      In
    > => ({
      ...logic,
      getPersistedSnapshot(snapshot) {
        return Schema.encodeUnknownSync(schemaSnapshotContext(
          Serializable.successSchema(snapshot.input as any),
          Serializable.failureSchema(snapshot.input as any),
          schema
        ))(snapshot)
      },
      restoreSnapshot(snapshot, { self, system }) {
        const { input } = decodeInput(snapshot)
        const result = Schema.decodeUnknownSync(schemaSnapshotContext(
          Serializable.successSchema(input as any),
          Serializable.failureSchema(input as any),
          schema
        ))(snapshot)
        return {
          ...result,
          _stream: Stream.provideService(streamCreator(self, input), ActorSystem, system),
          _fiber: undefined
        } as any
      }
    })
  )
}

/**
 * @since 1.0.0
 * @category models
 */
export interface RunningActor<Logic extends AnyActorLogic> {
  readonly id: string
  readonly sessionId: string
  readonly logic: Logic
  readonly system: XstateSystem<any>
  readonly subscribe: Effect.Effect<Queue.Dequeue<SnapshotFrom<Logic>>, never, Scope.Scope>
  readonly stream: Stream.Stream<SnapshotFrom<Logic>>
  readonly effect: Effect.Effect<SnapshotFrom<Logic>>
  readonly send: (event: EventFromLogic<Logic>) => Effect.Effect<void>
  readonly snapshot: Effect.Effect<SnapshotFrom<Logic>>
  readonly persistedSnapshot: Effect.Effect<Snapshot.Unknown>
}

type RunOptions<Logic extends AnyActorLogic> = ConditionalRequired<[
  options?:
    & ActorOptions<Logic>
    & {
      [K in RequiredOptions<Logic>]: unknown
    }
], IsNotNever<RequiredOptions<Logic>>>
type RequiredOptions<TLogic extends AnyActorLogic> = undefined extends InputFrom<TLogic> ? never : "input"

const isComplete = (snapshot: Snapshot.Unknown) =>
  snapshot.status === "done" || snapshot.status === "error" || snapshot.status === "stopped"

/**
 * @since 1.0.0
 * @category constructors
 */
export const run: {
  <Logic extends AnyActorLogic, E, R>(
    logic: Effect.Effect<Logic, E, R>,
    ...[options]: RunOptions<Logic>
  ): Effect.Effect<RunningActor<Logic>, E, Scope.Scope | R>
  <Logic extends AnyActorLogic>(
    logic: Logic,
    ...[options]: RunOptions<Logic>
  ): Effect.Effect<RunningActor<Logic>, never, Scope.Scope>
} = <Logic extends AnyActorLogic>(
  logic: Logic | Effect.Effect<Logic, never, never>,
  ...[options]: RunOptions<Logic>
): Effect.Effect<RunningActor<Logic>, never, Scope.Scope> =>
  Effect.flatMap(
    Effect.isEffect(logic) ? logic : Effect.succeed(logic),
    (logic) => {
      const actor = createActor(logic, options)
      actor.subscribe({ error() {} }) // prevent unhandled error

      const subscribe = Effect.uninterruptible(Effect.tap(
        Queue.unbounded<SnapshotFrom<Logic>>(),
        (queue) => {
          const sub = actor.subscribe({
            next(value) {
              queue.unsafeOffer(value)
            },
            error() {}
          })
          queue.unsafeOffer(actor.getSnapshot())
          return Effect.addFinalizer(() => Effect.sync(() => sub.unsubscribe()))
        }
      ))

      const channel = subscribe.pipe(
        Effect.map((dequeue) => {
          const loop: Channel.Channel<Chunk.Chunk<SnapshotFrom<Logic>>> = Channel.flatMap(
            dequeue.takeBetween(1, Number.MAX_SAFE_INTEGER),
            (chunk) => {
              const last = Chunk.unsafeLast(chunk)
              if (isComplete(last)) {
                return Channel.write(chunk)
              }
              return Channel.zipRight(
                Channel.write(chunk),
                loop
              )
            }
          )
          return loop
        }),
        Channel.unwrapScoped
      )
      const stream = Stream.fromChannel(channel)
      const effect = Effect.async<SnapshotFrom<Logic>>((resume) => {
        const current = actor.getSnapshot()
        if (isComplete(current)) {
          resume(Effect.succeed(current))
          return
        }
        const sub = actor.subscribe({
          error() {
            resume(Effect.succeed(actor.getSnapshot()))
          },
          complete() {
            resume(Effect.succeed(actor.getSnapshot()))
          }
        })
        return Effect.sync(() => {
          sub.unsubscribe()
        })
      })

      actor.start()

      return Effect.acquireRelease(
        Effect.succeed<RunningActor<Logic>>({
          id: actor.id,
          sessionId: actor.sessionId,
          logic,
          system: actor.system,
          subscribe,
          stream,
          effect,
          send(event) {
            return Effect.sync(() => actor.send(event))
          },
          snapshot: Effect.sync(() => actor.getSnapshot()),
          persistedSnapshot: Effect.sync(() => actor.getPersistedSnapshot())
        }),
        () =>
          Effect.sync(() => {
            actor.stop()
          })
      )
    }
  )

/**
 * @since 1.0.0
 * @category constructors
 */
export const runStream: {
  <Logic extends AnyActorLogic, E, R>(
    logic: Effect.Effect<Logic, E, R>,
    ...[options]: RunOptions<Logic>
  ): Stream.Stream<SnapshotFrom<Logic>, E, R>
  <Logic extends AnyActorLogic>(
    logic: Logic,
    ...[options]: RunOptions<Logic>
  ): Stream.Stream<SnapshotFrom<Logic>>
} = <Logic extends AnyActorLogic>(
  logic: Logic,
  ...[options]: RunOptions<Logic>
): Stream.Stream<SnapshotFrom<Logic>> =>
  run(logic, options).pipe(
    Effect.map((_) => _.stream),
    Stream.unwrapScoped
  )

/**
 * @since 1.0.0
 * @category constructors
 */
export const runStreamContext: {
  <Logic extends AnyActorLogic, E, R>(
    logic: Effect.Effect<Logic, E, R>,
    ...[options]: ConditionalRequired<
      [options?: (ActorOptions<Logic> & { [K in RequiredOptions<Logic>]: unknown }) | undefined],
      IsNotNever<RequiredOptions<Logic>>
    >
  ): Stream.Stream<
    Snapshot.InferContextNonNullable<SnapshotFrom<Logic>>,
    | E
    | Snapshot.InferError<SnapshotFrom<Logic>>,
    R
  >
  <Logic extends AnyActorLogic>(
    logic: Logic,
    ...[options]: ConditionalRequired<
      [options?: (ActorOptions<Logic> & { [K in RequiredOptions<Logic>]: unknown }) | undefined],
      IsNotNever<RequiredOptions<Logic>>
    >
  ): Stream.Stream<
    Snapshot.InferContextNonNullable<SnapshotFrom<Logic>>,
    Snapshot.InferError<SnapshotFrom<Logic>>
  >
} = <Logic extends AnyActorLogic>(
  logic: Logic,
  ...[options]: RunOptions<Logic>
): Stream.Stream<
  Snapshot.InferContextNonNullable<SnapshotFrom<Logic>>,
  Snapshot.InferError<SnapshotFrom<Logic>>
> => Snapshot.flattenStreamContext(runStream(logic, options)) as any

/**
 * @since 1.0.0
 * @category constructors
 */
export const runEffect: {
  <Logic extends AnyActorLogic, E, R>(
    logic: Effect.Effect<Logic, E, R>,
    ...[options]: ConditionalRequired<
      [options?: (ActorOptions<Logic> & { [K in RequiredOptions<Logic>]: unknown }) | undefined],
      IsNotNever<RequiredOptions<Logic>>
    >
  ): Effect.Effect<
    Snapshot.InferSuccess<SnapshotFrom<Logic>>,
    | E
    | Snapshot.InferError<SnapshotFrom<Logic>>,
    R
  >
  <Logic extends AnyActorLogic>(
    logic: Logic,
    ...[options]: ConditionalRequired<
      [options?: (ActorOptions<Logic> & { [K in RequiredOptions<Logic>]: unknown }) | undefined],
      IsNotNever<RequiredOptions<Logic>>
    >
  ): Effect.Effect<
    Snapshot.InferSuccess<SnapshotFrom<Logic>>,
    Snapshot.InferError<SnapshotFrom<Logic>>
  >
} = <Logic extends AnyActorLogic>(
  logic: Logic,
  ...[options]: RunOptions<Logic>
): Effect.Effect<
  Snapshot.InferSuccess<SnapshotFrom<Logic>>,
  Snapshot.InferError<SnapshotFrom<Logic>>
> =>
  run(logic, options).pipe(
    Effect.flatMap((_) => _.effect),
    Snapshot.flattenEffect,
    Effect.scoped
  ) as any
