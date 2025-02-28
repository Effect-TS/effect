import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import { CommitPrototype } from "effect/Effectable"
import * as Either from "effect/Either"
import { dual, identity } from "effect/Function"
import * as Option from "effect/Option"
import { pipeArguments } from "effect/Pipeable"
import * as Predicate from "effect/Predicate"
import * as Schedule from "effect/Schedule"
import * as Scope from "effect/Scope"
import type * as AiModel from "../AiModel.js"
import { AiModels } from "../AiModels.js"
import type * as AiPlan from "../AiPlan.js"

/** @internal */
export const TypeId: AiPlan.TypeId = Symbol.for("@effect/ai/AiPlan") as AiPlan.TypeId

/** @internal */
export const PlanPrototype = {
  ...CommitPrototype,
  [TypeId]: TypeId,
  commit(this: AiPlan.AiPlan<any, any, any>) {
    return buildPlan(this)
  },
  pipe() {
    return pipeArguments(this, arguments)
  }
} as any

const makePlan = <
  Steps extends ReadonlyArray<AiPlan.AiPlan.Step<any, any, any>>
>(steps: Steps): AiPlan.AiPlan<any, any, any> => {
  const self = Object.create(PlanPrototype)
  self.steps = steps
  return self
}

const buildPlan = <Error, Provides, Requires>(
  plan: AiPlan.AiPlan<Error, Provides, Requires>
): Effect.Effect<
  <A, E, R>(effect: Effect.Effect<A, E, R>) => Effect.Effect<A, E, Exclude<R, Provides>>,
  never,
  Requires | AiModels
> =>
  Effect.map(Effect.context<AiModels | Requires>(), (context) => {
    const models = Context.get(context, AiModels)
    return Effect.fnUntraced(function*<A, E, R>(effect: Effect.Effect<A, E, R>) {
      let result: Either.Either<A, E> | undefined = undefined
      for (const step of plan.steps) {
        if (result !== undefined && Either.isLeft(result) && Option.isSome(step.check)) {
          const check = step.check.value(result.left as any)
          const isFatalError = !(Effect.isEffect(check) ? yield* check : check)
          if (isFatalError) break
        }
        const retryOptions = getRetryOptions(step)
        result = yield* Effect.scopedWith((scope) =>
          models.build(step.model, context).pipe(
            Scope.extend(scope),
            Effect.flatMap((context) =>
              effect.pipe(
                Option.isSome(retryOptions)
                  ? Effect.retry(retryOptions.value)
                  : identity,
                Effect.provide(context)
              )
            ),
            Effect.either
          )
        )
        if (Either.isRight(result)) break
      }
      return yield* result!
    })
  })

const getRetryOptions = <Error, Provides, Requires>(
  step: AiPlan.AiPlan.Step<Error, Provides, Requires>
): Option.Option<Effect.Retry.Options<any>> => {
  if (Option.isNone(step.schedule) && Option.isNone(step.check)) {
    return Option.none()
  }
  return Option.some({
    schedule: Option.getOrUndefined(step.schedule),
    while: Option.getOrUndefined(step.check)
  })
}

/** @internal */
export const fromModel = <Provides, Requires, EW, Out, ES, RW = never, RS = never>(
  model: AiModel.AiModel<Provides, Requires>,
  options?: {
    readonly attempts?: number | undefined
    readonly while?: ((error: EW) => boolean | Effect.Effect<boolean, never, RW>) | undefined
    readonly schedule?: Schedule.Schedule<Out, ES, RS> | undefined
  }
): AiPlan.AiPlan<EW & ES, Provides, RW | RS | Requires> =>
  makePlan([{
    model,
    check: Option.fromNullable(options?.while) as any,
    schedule: resolveSchedule(options ?? {})
  }])

/** @internal */
export const withFallback = dual(2, <
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
  self: AiPlan.AiPlan<E, Provides, Requires>,
  options: {
    readonly model: AiModel.AiModel<Provides2, Requires2>
    readonly attempts?: number | undefined
    readonly while?: ((error: EW) => boolean | Effect.Effect<boolean, never, RW>) | undefined
    readonly schedule?: Schedule.Schedule<Out, ES, RS> | undefined
  }
): AiPlan.AiPlan<E & EW & ES, Provides & Provides2, Requires | Requires2 | RW | RS> =>
  makePlan([
    ...self.steps,
    {
      model: options.model,
      check: Option.fromNullable(options.while) as any,
      schedule: resolveSchedule(options)
    }
  ]))

const resolveSchedule = <E, R, Out, R2>(options: {
  readonly attempts?: number | undefined
  readonly schedule?: Schedule.Schedule<Out, E, R2> | undefined
}): Option.Option<Schedule.Schedule<Out, E, R | R2>> => {
  if (
    Predicate.isUndefined(options.attempts) &&
    Predicate.isUndefined(options.schedule)
  ) return Option.none()
  let schedule = (options.schedule ?? Schedule.forever) as Schedule.Schedule<any, E, R | R2>
  if (Predicate.isNotUndefined(options.attempts)) {
    // In an `AiPlan`, the `attempts` represents the total number of times to
    // attempt the call, not the number of retries, thus we subtract one from
    // the total number of recurrences
    schedule = Schedule.intersect(schedule, Schedule.recurs(options.attempts - 1))
  }
  return Option.some(schedule)
}

/** @internal */
export const concatSteps = dual<
  <Error2, Provides2, Requires2>(
    other: AiPlan.AiPlan<Error2, Provides2, Requires2>
  ) => <Error, Provides, Requires>(
    self: AiPlan.AiPlan<Error, Provides, Requires>
  ) => AiPlan.AiPlan<Error & Error2, Provides & Provides2, Requires | Requires2>,
  <Error, Provides, Requires, Error2, Provides2, Requires2>(
    self: AiPlan.AiPlan<Error, Provides, Requires>,
    other: AiPlan.AiPlan<Error2, Provides2, Requires2>
  ) => AiPlan.AiPlan<Error & Error2, Provides & Provides2, Requires | Requires2>
>(2, (self, other) => makePlan([...self.steps, ...other.steps]))
