/**
 * @since 1.0.0
 */
import type { NonEmptyReadonlyArray } from "effect/Array"
import * as Cause from "effect/Cause"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import { CommitPrototype } from "effect/Effectable"
import * as Exit from "effect/Exit"
import { constTrue, dual } from "effect/Function"
import * as Option from "effect/Option"
import { type Pipeable, pipeArguments } from "effect/Pipeable"
import * as Predicate from "effect/Predicate"
import * as Schedule from "effect/Schedule"
import * as Scope from "effect/Scope"
import type * as Unify from "effect/Unify"
import { AiModels } from "./AiModels.js"

/**
 * @since 1.0.0
 * @category type ids
 */
export const TypeId: unique symbol = Symbol.for("@effect/ai/AiModel")

/**
 * @since 1.0.0
 * @category type ids
 */
export type TypeId = typeof TypeId

/**
 * @since 1.0.0
 * @category type ids
 */
export const PlanTypeId: unique symbol = Symbol.for("@effect/ai/Plan")

/**
 * @since 1.0.0
 * @category type ids
 */
export type PlanTypeId = typeof TypeId

/**
 * @since 1.0.0
 * @category models
 */
export interface AiModel<Provides, Requires> extends Plan<unknown, Provides, Requires>, Pipeable {
  readonly [TypeId]: TypeId
  readonly model: string
  readonly cacheKey: symbol
  readonly requires: Context.Tag<Requires, any>
  readonly provides: AiModel.ContextBuilder<Provides, Requires>
  readonly context: Context.Context<never>
}

/**
 * @since 1.0.0
 */
export declare namespace AiModel {
  /**
   * @since 1.0.0
   * @category models
   */
  export type ContextBuilder<Provides, Requires> = Effect.Effect<
    Context.Context<Provides>,
    never,
    Requires | Scope.Scope
  >
}

/**
 * @since 1.0.0
 * @category Plan
 */
export interface Plan<in Error, in out Provides, out Requires> extends
  Pipeable,
  Effect.Effect<
    <A, E, R>(effect: Effect.Effect<A, E, R>) => Effect.Effect<A, E, Exclude<R, Provides>>,
    never,
    Requires | AiModels
  >
{
  readonly [PlanTypeId]: PlanTypeId
  readonly steps: NonEmptyReadonlyArray<Plan.Step<Error, Provides, Requires>>
  readonly [Unify.typeSymbol]?: unknown
  readonly [Unify.unifySymbol]?: Plan.Unify<this>
  readonly [Unify.ignoreSymbol]?: Plan.UnifyIgnore
}

/**
 * @since 1.0.0
 * @category Plan
 */
export declare namespace Plan {
  /**
   * @since 1.0.0
   * @category Plan
   */
  export interface Unify<A extends { [Unify.typeSymbol]?: any }> extends Effect.EffectUnify<A> {
    AiModelPlan?: () => Extract<A[Unify.typeSymbol], Plan<any, any, any>>
  }

  /**
   * @since 1.0.0
   * @category Plan
   */
  export interface UnifyIgnore extends Effect.EffectUnifyIgnore {
    Effect?: true
  }

  /**
   * @since 1.0.0
   * @category Plan
   */
  export interface Step<Error, Provides, Requires> {
    readonly model: AiModel<Provides, Requires>
    readonly check: (error: Error) => boolean | Effect.Effect<boolean>
    readonly schedule: Option.Option<Schedule.Schedule<any, Error, Requires>>
  }
}

const PlanProto = {
  ...CommitPrototype,
  [PlanTypeId]: PlanTypeId,
  commit(this: Plan<any, any, any>) {
    return buildPlan(this)
  },
  pipe() {
    return pipeArguments(this, arguments)
  }
}

const AiModelProto = {
  ...PlanProto,
  [TypeId]: TypeId
}

/**
 * @since 1.0.0
 * @category constructors
 */
export const make = <Provides, Requires>(options: {
  readonly model: string
  readonly cacheKey: symbol
  readonly requires: Context.Tag<Requires, any>
  readonly provides: AiModel.ContextBuilder<Provides, Requires>
  readonly context: Context.Context<never>
}): AiModel<Provides, Requires> => {
  const self = Object.create(AiModelProto)
  self.cacheKey = options.cacheKey
  self.model = options.model
  self.provides = options.provides
  self.requires = options.requires
  self.context = options.context
  self.steps = [{
    model: self,
    schedule: Option.none()
  }]
  return self
}

const makePlan = <
  Steps extends ReadonlyArray<Plan.Step<any, any, any>>
>(steps: Steps): Plan<any, any, any> => {
  const self = Object.create(PlanProto)
  self.steps = steps
  return self
}

/**
 * @since 1.0.0
 * @category error handling
 */
export const retry: {
  <E, Out, ES, RW = never, RS = never>(options: {
    readonly attempts?: number | undefined
    readonly while?: ((error: E) => boolean | Effect.Effect<boolean, never, RW>) | undefined
    readonly schedule?: Schedule.Schedule<Out, ES, RS> | undefined
  }): <Provides, Requires>(
    self: AiModel<Provides, Requires>
  ) => Plan<E & ES, Provides, RW | RS | Requires>
  <Provides, Requires, E, Out, ES, R = never, R2 = never>(
    self: AiModel<Provides, Requires>,
    options: {
      readonly attempts?: number | undefined
      readonly while?:
        | ((error: E) => boolean | Effect.Effect<boolean, never, R>)
        | undefined
      readonly schedule?: Schedule.Schedule<Out, ES, R2> | undefined
    }
  ): Plan<E & ES, Provides, R | R2 | Requires>
} = dual<
  <E, Out, ES, RW = never, RS = never>(options: {
    readonly attempts?: number | undefined
    readonly while?: ((error: E) => boolean | Effect.Effect<boolean, never, RW>) | undefined
    readonly schedule?: Schedule.Schedule<Out, ES, RS> | undefined
  }) => <Provides, Requires>(
    self: AiModel<Provides, Requires>
  ) => Plan<E & ES, Provides, RW | RS | Requires>,
  <Provides, Requires, E, Out, ES, R = never, R2 = never>(
    self: AiModel<Provides, Requires>,
    options: {
      readonly attempts?: number | undefined
      readonly while?:
        | ((error: E) => boolean | Effect.Effect<boolean, never, R>)
        | undefined
      readonly schedule?: Schedule.Schedule<Out, ES, R2> | undefined
    }
  ) => Plan<E & ES, Provides, R | R2 | Requires>
>(2, (self, options) =>
  makePlan([{
    model: self,
    check: (options.while ?? constTrue) as any,
    schedule: resolveSchedule(options)
  }]))

/**
 * @since 1.0.0
 * @category error handling
 */
export const withFallback: {
  <
    Provides,
    Provides2 extends Provides,
    Requires2,
    Out,
    EW,
    ES,
    RW = never,
    RS = never
  >(options: {
    readonly model: AiModel<Provides2, Requires2>
    readonly attempts?: number | undefined
    readonly while?: ((error: EW) => boolean | Effect.Effect<boolean, never, RW>) | undefined
    readonly schedule?: Schedule.Schedule<Out, ES, RS> | undefined
  }): <E, Requires>(
    self: Plan<E, Provides, Requires>
  ) => Plan<E & EW & ES, Provides & Provides2, Requires | Requires2 | RW | RS>
  <
    E,
    Provides,
    Requires,
    Provides2 extends Provides,
    Requires2,
    Out,
    EW,
    ES,
    RW = never,
    RS = never
  >(
    self: Plan<E, Provides, Requires>,
    options: {
      readonly model: AiModel<Provides2, Requires2>
      readonly attempts?: number | undefined
      readonly while?: ((error: EW) => boolean | Effect.Effect<boolean, never, RW>) | undefined
      readonly schedule?: Schedule.Schedule<Out, ES, RS> | undefined
    }
  ): Plan<E & EW & ES, Provides & Provides2, Requires | Requires2 | RW | RS>
} = dual(2, <
  E,
  Provides,
  Requires,
  Provides2 extends Provides,
  Requires2,
  Out,
  EW,
  ES,
  RW = never,
  RS = never
>(
  self: Plan<E, Provides, Requires>,
  options: {
    readonly model: AiModel<Provides2, Requires2>
    readonly attempts?: number | undefined
    readonly while?: ((error: EW) => boolean | Effect.Effect<boolean, never, RW>) | undefined
    readonly schedule?: Schedule.Schedule<Out, ES, RS> | undefined
  }
): Plan<E & EW & ES, Provides & Provides2, Requires | Requires2 | RW | RS> =>
  makePlan([
    ...self.steps,
    {
      model: options.model,
      check: options.while as any ?? constTrue,
      schedule: resolveSchedule(options)
    }
  ]))

const resolveSchedule = <E, R, Out, R2>(options: {
  readonly attempts?: number
  readonly schedule?: Schedule.Schedule<Out, E, R2>
}): Option.Option<Schedule.Schedule<Out, E, R | R2>> => {
  if (
    Predicate.isUndefined(options.attempts) &&
    Predicate.isUndefined(options.schedule)
  ) return Option.none()
  let schedule = (options.schedule ?? Schedule.forever) as Schedule.Schedule<any, E, R | R2>
  if (Predicate.isNotUndefined(options.attempts)) {
    schedule = Schedule.intersect(schedule, Schedule.recurs(options.attempts))
  }
  return Option.some(schedule)
}

/**
 * @since 1.0.0
 * @category Plan
 */
export const buildPlan = <Error, Provides, Requires>(
  plan: Plan<Error, Provides, Requires>
): Effect.Effect<
  <A, E, R>(effect: Effect.Effect<A, E, R>) => Effect.Effect<A, E, Exclude<R, Provides>>,
  never,
  Requires | AiModels
> =>
  Effect.map(Effect.context<AiModels | Requires>(), (context) => {
    const models = Context.get(context, AiModels)
    return Effect.fnUntraced(function*<A, E, R>(effect: Effect.Effect<A, E, R>) {
      let exit: Exit.Exit<A, E> | undefined = undefined
      for (const step of plan.steps) {
        if (exit !== undefined && Exit.isFailure(exit)) {
          const check = step.check(Cause.squash(exit.cause) as Error)
          const isFatalError = !(Effect.isEffect(check) ? yield* check : check)
          if (isFatalError) break
        }
        const retryPolicy = Option.getOrUndefined(step.schedule) as Schedule.Schedule<any, unknown, never>
        exit = yield* Effect.scopedWith((scope) =>
          models.build(step.model, context).pipe(
            Scope.extend(scope),
            Effect.flatMap((context) =>
              effect.pipe(
                // @ts-expect-error
                Effect.retry({
                  schedule: retryPolicy,
                  while: step.check
                }),
                Effect.provide(context)
              )
            ),
            Effect.exit
          )
        )
        if (Exit.isSuccess(exit)) break
      }
      return yield* exit!
    })
  })
