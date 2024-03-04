/**
 * @since 1.0.0
 */
import * as Schema from "@effect/schema/Schema"
import * as Serializable from "@effect/schema/Serializable"
import type * as Cause from "effect/Cause"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import type * as Fiber from "effect/Fiber"
import { identity } from "effect/Function"
import * as Runtime from "effect/Runtime"
import type { ActorLogic, ActorRefFrom, ActorSystem, AnyEventObject } from "xstate"

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
export type EffectSnapshotPersisted<A, E = never, In = unknown> = {
  readonly status: "active"
  readonly output: undefined
  readonly error: undefined
  readonly input: In
} | {
  readonly status: "done"
  readonly output: A
  readonly error: undefined
  readonly input: In
} | {
  readonly status: "error"
  readonly output: undefined
  readonly error: Cause.Cause<E>
  readonly input: In
} | {
  readonly status: "stopped"
  readonly output: undefined
  readonly error: undefined
  readonly input: In
}

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
  effectCreator: ({ input }: {
    /**
     * Data that was provided to the effect actor
     */
    input: In
    /**
     * The actor system to which the effect actor belongs
     */
    system: ActorSystem<any>
    /**
     * The parent actor of the effect actor
     */
    self: EffectActorRef<A, E>
  }) => Effect.Effect<A, E, R>
): Effect.Effect<EffectActorLogic<A, E, In>, never, R> =>
  Effect.map(
    Effect.runtime<R>(),
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
            _effect: effectCreator({ input, system, self }),
            _fiber: undefined
          }
        },
        start(state, { self }) {
          if (!(state.status === "active" && state._fiber === undefined)) {
            return
          }
          state._fiber = runFork(state._effect as Effect.Effect<A, E, R>)
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
            _effect: effectCreator({ input: (state as any).input, system, self }),
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
  effectCreator: ({ input }: {
    /**
     * Data that was provided to the effect actor
     */
    input: In
    /**
     * The actor system to which the effect actor belongs
     */
    system: ActorSystem<any>
    /**
     * The parent actor of the effect actor
     */
    self: EffectActorRef<
      Schema.Schema.To<In[typeof Serializable.symbolResult]["Success"]>,
      Schema.Schema.To<In[typeof Serializable.symbolResult]["Failure"]>
    >
  }) => Effect.Effect<
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
          _effect: effectCreator({ input, system, self }),
          _fiber: undefined
        } as any
      }
    })
  )
}
