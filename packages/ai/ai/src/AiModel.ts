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
export const PlanTypeId: unique symbol = Symbol.for("@effect/ai/AiModel/Plan")

/**
 * @since 1.0.0
 * @category type ids
 */
export type PlanTypeId = typeof TypeId

/**
 * @since 1.0.0
 * @category models
 */
export interface AiModel<Provides, Requires> extends AiModel.Proto, AiModel.Plan<unknown, Provides, Requires> {
  readonly model: string
  readonly requires: AiModel.Requirements<Requires>
  readonly provides: AiModel.ContextBuilder<Provides, Requires>
}

/**
 * @since 1.0.0
 */
export declare namespace AiModel {
  /**
   * @since 1.0.0
   * @category models
   */
  export interface Proto extends Pipeable {
    readonly [TypeId]: TypeId
  }

  /**
   * @since 1.0.0
   * @category models
   */
  export type Requirements<Requires> = Context.Tag<Requires, any>

  /**
   * @since 1.0.0
   * @category models
   */
  export type ContextBuilder<Provides, Requires> = Effect.Effect<
    Context.Context<Provides>,
    never,
    Requires | Scope.Scope
  >

  /**
   * @since 1.0.0
   * @category models
   */
  export interface Plan<Error, Provides, Requires> extends
    PlanProto,
    Effect.Effect<
      <A, E, R>(effect: Effect.Effect<A, E, R>) => Effect.Effect<A, E, Exclude<R, Provides>>,
      never,
      Requires | AiModels
    >
  {
    readonly steps: NonEmptyReadonlyArray<PlanStep<Error, Provides, Requires>>
    readonly [Unify.typeSymbol]?: unknown
    readonly [Unify.unifySymbol]?: PlanUnify<this>
    readonly [Unify.ignoreSymbol]?: PlanUnifyIgnore
  }

  /**
   * @since 1.0.0
   * @category models
   */
  export interface PlanUnify<A extends { [Unify.typeSymbol]?: any }> extends Effect.EffectUnify<A> {
    AiModelPlan?: () => Extract<A[Unify.typeSymbol], AiModel.Plan<any, any, any>>
  }

  /**
   * @since 1.0.0
   * @category models
   */
  export interface PlanUnifyIgnore extends Effect.EffectUnifyIgnore {
    Effect?: true
  }

  /**
   * @since 1.0.0
   * @category models
   */
  export interface PlanProto extends Pipeable {
    readonly [PlanTypeId]: PlanTypeId
  }

  /**
   * @since 1.0.0
   * @category models
   */
  export interface PlanStep<Error, Provides, Requires> {
    readonly model: AiModel<Provides, Requires>
    readonly check: (error: Error) => boolean | Effect.Effect<boolean>
    readonly schedule: Option.Option<Schedule.Schedule<any, Error, Requires>>
  }
}

const AiModelProto = {
  [TypeId]: TypeId,
  [PlanTypeId]: PlanTypeId,
  pipe() {
    return pipeArguments(this, arguments)
  }
}

/**
 * @since 1.0.0
 * @category constructors
 */
export const make = <Provides, Requires>(options: {
  readonly model: string
  readonly requires: AiModel.Requirements<Requires>
  readonly provides: AiModel.ContextBuilder<Provides, Requires>
}): AiModel<Provides, Requires> => {
  const self = Object.create(AiModelProto)
  self.model = options.model
  self.provides = options.provides
  self.requires = options.requires
  self.steps = [{
    model: self,
    schedule: Option.none()
  }]
  return self
}

const AiModelPlanProto = {
  ...CommitPrototype,
  [PlanTypeId]: PlanTypeId,
  commit(this: AiModel.Plan<any, any, any>) {
    return buildPlan(this)
  },
  pipe() {
    return pipeArguments(this, arguments)
  }
}

/**
 * @since 1.0.0
 * @category constructors
 */
const makePlan = <
  Steps extends ReadonlyArray<AiModel.PlanStep<any, any, any>>
>(steps: Steps): AiModel.Plan<any, any, any> => {
  const self = Object.create(AiModelPlanProto)
  self.steps = steps
  return self
}

/**
 * @since 1.0.0
 * @category error handling
 */
export const retry: {
  <E, R = never>(options: {
    readonly attempts: number
    readonly while?: (error: E) => boolean | Effect.Effect<boolean, never, R>
  }): <Provides, Requires>(
    self: AiModel<Provides, Requires>
  ) => AiModel.Plan<E, Provides, R | Requires>
  <Provides, Requires, E, R = never>(
    self: AiModel<Provides, Requires>,
    options: {
      readonly attempts: number
      readonly while?: (error: E) => boolean | Effect.Effect<boolean, never, R>
    }
  ): AiModel.Plan<E, Provides, R | Requires>
} = dual<
  <E, R = never>(options: {
    readonly attempts: number
    readonly while?: (error: E) => boolean | Effect.Effect<boolean, never, R>
  }) => <Provides, Requires>(
    self: AiModel<Provides, Requires>
  ) => AiModel.Plan<E, Provides, R | Requires>,
  <Provides, Requires, E, R = never>(
    self: AiModel<Provides, Requires>,
    options: {
      readonly attempts: number
      readonly while?: (error: E) => boolean | Effect.Effect<boolean, never, R>
    }
  ) => AiModel.Plan<E, Provides, R | Requires>
>(2, (self, options) => {
  return makePlan([{
    model: self,
    check: (options.while ?? constTrue) as any,
    schedule: options.attempts ? Option.some(Schedule.recurs(options.attempts)) : Option.none()
  }])
})

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
    E2 = never,
    WR = never,
    SR = never
  >(options: {
    readonly model: AiModel<Provides2, Requires2>
    readonly attempts?: number
    readonly while?: (error: E2) => boolean | Effect.Effect<boolean, never, WR>
    readonly schedule?: Schedule.Schedule<Out, E2, SR>
  }): <E, Requires>(
    self: AiModel<Provides, Requires> | AiModel.Plan<E, Provides, Requires>
  ) => AiModel.Plan<E | E2, Provides, Requires | Requires2 | WR | SR>
  <
    Provides,
    Requires,
    E,
    Provides2 extends Provides,
    Requires2,
    Out,
    E2 = never,
    WR = never,
    SR = never
  >(
    self: AiModel<Provides, Requires> | AiModel.Plan<E, Provides, Requires>,
    options: {
      readonly model: AiModel<Provides2, Requires2>
      readonly attempts?: number
      readonly while?: (error: E2) => boolean | Effect.Effect<boolean, never, WR>
      readonly schedule?: Schedule.Schedule<Out, E2, SR>
    }
  ): AiModel.Plan<E | E2, Provides, Requires | Requires2 | WR | SR>
} = dual<
  <
    Provides,
    Provides2 extends Provides,
    Requires2,
    Out,
    E2 = never,
    WR = never,
    SR = never
  >(options: {
    readonly model: AiModel<Provides2, Requires2>
    readonly attempts?: number
    readonly while?: (error: E2) => boolean | Effect.Effect<boolean, never, WR>
    readonly schedule?: Schedule.Schedule<Out, E2, SR>
  }) => <E, Requires>(
    self: AiModel<Provides, Requires> | AiModel.Plan<E, Provides, Requires>
  ) => AiModel.Plan<E | E2, Provides, Requires | Requires2 | WR | SR>,
  <
    Provides,
    Requires,
    E,
    Provides2 extends Provides,
    Requires2,
    Out,
    E2 = never,
    WR = never,
    SR = never
  >(
    self: AiModel<Provides, Requires> | AiModel.Plan<E, Provides, Requires>,
    options: {
      readonly model: AiModel<Provides2, Requires2>
      readonly attempts?: number
      readonly while?: (error: E2) => boolean | Effect.Effect<boolean, never, WR>
      readonly schedule?: Schedule.Schedule<Out, E2, SR>
    }
  ) => AiModel.Plan<E | E2, Provides, Requires | Requires2 | WR | SR>
>(2, <
  Provides,
  Requires,
  E,
  Provides2 extends Provides,
  Requires2,
  E2,
  Out,
  WR = never,
  SR = never
>(
  self: AiModel<Provides, Requires> | AiModel.Plan<E, Provides, Requires>,
  options: {
    readonly model: AiModel<Provides2, Requires2>
    readonly attempts?: number
    readonly while?: (error: E2) => boolean | Effect.Effect<boolean, never, WR>
    readonly schedule?: Schedule.Schedule<Out, E2, SR>
  }
): AiModel.Plan<E | E2, Provides, Requires | Requires2 | WR | SR> => {
  const steps = TypeId in self ? [{ model: self, schedule: Option.none() }] : self.steps.slice()
  steps.push({
    model: options.model,
    check: options.while ?? constTrue,
    schedule: resolveSchedule(options)
  } as any)
  return makePlan(steps as any)
})

const resolveSchedule = <E, R, Out, R2>(options: {
  readonly attempts?: number
  readonly schedule?: Schedule.Schedule<Out, E, R2>
}): Option.Option<Schedule.Schedule<Out, E, R | R2>> => {
  if (
    Predicate.isUndefined(options.attempts) &&
    Predicate.isUndefined(options.schedule)
  ) return Option.none()
  let schedule = (options.schedule ?? Schedule.once) as Schedule.Schedule<any, E, R | R2>
  if (Predicate.isNotUndefined(options.attempts)) {
    schedule = Schedule.intersect(schedule, Schedule.recurs(options.attempts))
  }
  return Option.some(schedule)
}

/**
 * @since 1.0.0
 * @category planning
 */
export const buildPlan = <Error, Provides, Requires>(
  plan: AiModel.Plan<Error, Provides, Requires>
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
          Scope.extend(models.build(step.model, context), scope).pipe(
            Effect.flatMap((context) =>
              Effect.provide(
                // @ts-expect-error
                Effect.retry(effect, {
                  schedule: retryPolicy,
                  while: step.check
                }),
                context
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
