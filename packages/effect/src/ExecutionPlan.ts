/**
 * @since 3.16.0
 * @experimental
 */
import type { NonEmptyReadonlyArray } from "./Array.js"
import * as Arr from "./Array.js"
import type * as Context from "./Context.js"
import * as Effect from "./Effect.js"
import { dual } from "./Function.js"
import * as internal from "./internal/executionPlan.js"
import * as Layer from "./Layer.js"
import type { Pipeable } from "./Pipeable.js"
import { pipeArguments } from "./Pipeable.js"
import type * as Schedule from "./Schedule.js"
import type * as Types from "./Types.js"

/**
 * @since 3.16.0
 * @category Symbols
 * @experimental
 */
export const TypeId: unique symbol = internal.TypeId

/**
 * @since 3.16.0
 * @category Symbols
 * @experimental
 */
export type TypeId = typeof TypeId

/**
 * @since 3.16.0
 * @category Guards
 * @experimental
 */
export const isExecutionPlan: (u: unknown) => u is ExecutionPlan<unknown, unknown, unknown, unknown> =
  internal.isExecutionPlan

/**
 * A `ExecutionPlan` can be used with `Effect.withExecutionPlan` or `Stream.withExecutionPlan`, allowing you to provide different resources for each step of execution until the effect succeeds or the plan is exhausted.
 *
 * ```ts
 * import { type AiLanguageModel } from "@effect/ai"
 * import type { Layer } from "effect"
 * import { Effect, ExecutionPlan, Schedule } from "effect"
 *
 * declare const layerBad: Layer.Layer<AiLanguageModel.AiLanguageModel>
 * declare const layerGood: Layer.Layer<AiLanguageModel.AiLanguageModel>
 *
 * const ThePlan = ExecutionPlan.make(
 *   {
 *     // First try with the bad layer 2 times with a 3 second delay between attempts
 *     provide: layerBad,
 *     attempts: 2,
 *     schedule: Schedule.spaced(3000)
 *   },
 *   // Then try with the bad layer 3 times with a 1 second delay between attempts
 *   {
 *     provide: layerBad,
 *     attempts: 3,
 *     schedule: Schedule.spaced(1000)
 *   },
 *   // Finally try with the good layer.
 *   //
 *   // If `attempts` is omitted, the plan will only attempt once, unless a schedule is provided.
 *   {
 *     provide: layerGood
 *   }
 * )
 *
 * declare const effect: Effect.Effect<
 *   void,
 *   never,
 *   AiLanguageModel.AiLanguageModel
 * >
 * const withPlan: Effect.Effect<void> = Effect.withExecutionPlan(effect, ThePlan)
 * ```
 *
 * @since 3.16.0
 * @category Models
 * @experimental
 */
export interface ExecutionPlan<in out Provides, in In = unknown, out E = never, out R = never> extends Pipeable {
  readonly [TypeId]: TypeId
  readonly steps: NonEmptyReadonlyArray<{
    readonly schedule?: Schedule.Schedule<unknown, In, R> | undefined
    readonly attempts?: number | undefined
    readonly while?: ((input: In) => Effect.Effect<boolean, E, R>) | undefined
    readonly provide: Context.Context<Provides> | Layer.Layer<Provides, E, R>
  }>
  readonly withRequirements: Effect.Effect<ExecutionPlan<Provides, In, E>, never, R>
}

/**
 * Create an `ExecutionPlan`, which can be used with `Effect.withExecutionPlan` or `Stream.withExecutionPlan`, allowing you to provide different resources for each step of execution until the effect succeeds or the plan is exhausted.
 *
 * ```ts
 * import { type AiLanguageModel } from "@effect/ai"
 * import type { Layer } from "effect"
 * import { Effect, ExecutionPlan, Schedule } from "effect"
 *
 * declare const layerBad: Layer.Layer<AiLanguageModel.AiLanguageModel>
 * declare const layerGood: Layer.Layer<AiLanguageModel.AiLanguageModel>
 *
 * const ThePlan = ExecutionPlan.make(
 *   {
 *     // First try with the bad layer 2 times with a 3 second delay between attempts
 *     provide: layerBad,
 *     attempts: 2,
 *     schedule: Schedule.spaced(3000)
 *   },
 *   // Then try with the bad layer 3 times with a 1 second delay between attempts
 *   {
 *     provide: layerBad,
 *     attempts: 3,
 *     schedule: Schedule.spaced(1000)
 *   },
 *   // Finally try with the good layer.
 *   //
 *   // If `attempts` is omitted, the plan will only attempt once, unless a schedule is provided.
 *   {
 *     provide: layerGood
 *   }
 * )
 *
 * declare const effect: Effect.Effect<
 *   void,
 *   never,
 *   AiLanguageModel.AiLanguageModel
 * >
 * const withPlan: Effect.Effect<void> = Effect.withExecutionPlan(effect, ThePlan)
 * ```
 *
 * @since 3.16.0
 * @category Constructors
 * @experimental
 */
export const make = <
  const Steps extends NonEmptyReadonlyArray<make.Step>
>(...steps: Steps & { [K in keyof Steps]: make.Step }): ExecutionPlan<
  Steps[number]["provide"] extends Context.Context<infer Provides> | Layer.Layer<infer Provides, infer _E, infer _R>
    ? Provides
    : never,
  Types.UnionToIntersection<
    | (Steps[number]["while"] extends (input: infer In) => any ? In : never)
    | (Steps[number]["schedule"] extends Schedule.Schedule<infer _Out, infer In, infer _R> ? In : never)
  >,
  | (Steps[number]["provide"] extends Layer.Layer<infer _P, infer _E, infer _R> ? _E
    : never)
  | (Steps[number]["while"] extends (input: infer _I) => Effect.Effect<infer _A, infer _E, infer _R> ? _E : never),
  | (Steps[number]["provide"] extends Layer.Layer<infer _P, infer _E, infer _R> ? _R
    : never)
  | (Steps[number]["while"] extends (input: infer _I) => Effect.Effect<infer _A, infer _E, infer _R> ? _R : never)
  | (Steps[number]["schedule"] extends Schedule.Schedule<infer _Out, infer _In, infer _R> ? _R : never)
> =>
  makeProto(Arr.map(steps as Steps, (step) => {
    if (step.attempts && step.attempts < 1) {
      throw new Error("ExecutionPlan.make: step.attempts must be greater than 0")
    }
    return {
      schedule: step.schedule,
      attempts: step.attempts,
      while: step.while
        ? (input: any) =>
          Effect.suspend(() => {
            const result = step.while!(input)
            return typeof result === "boolean" ? Effect.succeed(result) : result
          })
        : undefined,
      provide: step.provide
    }
  }))

/**
 * @since 3.16.0
 * @experimental
 */
export declare namespace make {
  /**
   * @since 3.16.0
   * @experimental
   */
  export type Step = {
    readonly provide:
      | Context.Context<any>
      | Context.Context<never>
      | Layer.Layer<any, any, any>
      | Layer.Layer<never, any, any>
    readonly attempts?: number
    readonly while?: (input: any) => boolean | Effect.Effect<boolean, any, any>
    readonly schedule?: Schedule.Schedule<any, any, any>
  }
}

const Proto: Omit<ExecutionPlan<any, any, any, any>, "steps"> = {
  [TypeId]: TypeId,
  get withRequirements() {
    const self = this as any as ExecutionPlan<any, any, any, any>
    return Effect.contextWith((context: Context.Context<any>) =>
      makeProto(self.steps.map((step) => ({
        ...step,
        provide: Layer.isLayer(step.provide) ? Layer.provide(step.provide, Layer.succeedContext(context)) : step.provide
      })) as any)
    )
  },
  pipe() {
    return pipeArguments(this, arguments)
  }
}

const makeProto = <Provides, In, PlanE, PlanR>(steps: ExecutionPlan<Provides, In, PlanE, PlanR>["steps"]) => {
  const self = Object.create(Proto)
  self.steps = steps
  return self
}

/**
 * @since 3.16.0
 * @category Constructors
 * @experimental
 */
export const orElse: {
  <
    Provides2,
    In2 = unknown,
    Err2 = never,
    Req2 = never
  >(other: ExecutionPlan<Provides2, In2, Err2, Req2>): <
    Provides,
    In,
    PlanE,
    PlanR
  >(
    self: ExecutionPlan<Provides, In, PlanE, PlanR>
  ) => ExecutionPlan<Provides & Provides2, In & In2, PlanE | Err2, PlanR | Req2>
  <
    Provides,
    In,
    PlanE,
    PlanR,
    Provides2,
    In2 = unknown,
    Err2 = never,
    Req2 = never
  >(
    self: ExecutionPlan<Provides, In, PlanE, PlanR>,
    other: ExecutionPlan<Provides2, In2, Err2, Req2>
  ): ExecutionPlan<Provides & Provides2, In & In2, PlanE | Err2, PlanR | Req2>
} = dual(2, <
  Provides,
  In,
  PlanE,
  PlanR,
  Provides2,
  In2 = unknown,
  Err2 = never,
  Req2 = never
>(
  self: ExecutionPlan<Provides, In, PlanE, PlanR>,
  other: ExecutionPlan<Provides2, In2, Err2, Req2>
): ExecutionPlan<Provides & Provides2, In & In2, PlanE | Err2, PlanR | Req2> =>
  makeProto(self.steps.concat(other.steps as any) as any))
