/**
 * @since 2.0.0
 */

import * as Cached from "@effect/io/Cached"
import * as Cause from "@effect/io/Cause"
import * as Clock from "@effect/io/Clock"
import * as DefaultServices from "@effect/io/DefaultServices"
import * as Deferred from "@effect/io/Deferred"
import * as Effect from "@effect/io/Effect"
import * as ExecutionStrategy from "@effect/io/ExecutionStrategy"
import * as Exit from "@effect/io/Exit"
import * as FiberRef from "@effect/io/FiberRef"
import * as Hub from "@effect/io/Hub"
import * as Layer from "@effect/io/Layer"
import * as Queue from "@effect/io/Queue"
import * as Random from "@effect/io/Random"
import * as Reloadable from "@effect/io/Reloadable"
import * as Runtime from "@effect/io/Runtime"
import * as Scope from "@effect/io/Scope"
import * as Supervisor from "@effect/io/Supervisor"
import * as Tracer from "@effect/io/Tracer"
import * as Context from "@fp-ts/data/Context"
import * as Duration from "@fp-ts/data/Duration"
import * as Either from "@fp-ts/data/Either"
import * as Equal from "@fp-ts/data/Equal"
import { absurd, flow, hole, identity, pipe, unsafeCoerce } from "@fp-ts/data/Function"
import * as Number from "@fp-ts/data/Number"
import * as Option from "@fp-ts/data/Option"
import * as Predicate from "@fp-ts/data/Predicate"
import * as String from "@fp-ts/data/String"
import * as Codec from "@fp-ts/schema/Codec"
import * as Fiber from "effect/index/Fiber"
import * as FiberRefs from "effect/index/FiberRefs"
import * as Logger from "effect/index/Logger"
import * as Metric from "effect/index/Metric"
import * as Optic from "effect/index/Optic"
import * as Ref from "effect/index/Ref"
import * as Schedule from "effect/index/Schedule"

export {
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://fp-ts.github.io/data/modules/Function.ts.html#absurd
   * - Module: "@fp-ts/data/Function"
   * ```
   */
  absurd,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/io/modules/Cached.ts.html
   * - Module: "@effect/io/Cached"
   * ```
   */
  Cached,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/io/modules/Cause.ts.html
   * - Module: "@effect/io/Cause"
   * ```
   */
  Cause,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/io/modules/Clock.ts.html
   * - Module: "@effect/io/Clock"
   * ```
   */
  Clock,
  /**
   * @since 2.0.0
   */
  Codec,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://fp-ts.github.io/data/modules/Context.ts.html
   * - Module: "@fp-ts/data/Context"
   * ```
   */
  Context,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/io/modules/DefaultServices.ts.html
   * - Module: "@effect/io/DefaultServices"
   * ```
   */
  DefaultServices,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/io/modules/Deferred.ts.html
   * - Module: "@effect/io/Deferred"
   * ```
   */
  Deferred,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://fp-ts.github.io/data/modules/Duration.ts.html
   * - Module: "@fp-ts/data/Duration"
   * ```
   */
  Duration,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/io/modules/Effect.ts.html
   * - Module: "@effect/io/Effect"
   * ```
   */
  Effect,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://fp-ts.github.io/data/modules/Either.ts.html
   * - Module: "@fp-ts/data/Either"
   * ```
   */
  Either,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://fp-ts.github.io/data/modules/Equal.ts.html
   * - Module: "@fp-ts/data/Equal"
   * ```
   */
  Equal,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/io/modules/ExecutionStrategy.ts.html
   * - Module: "@effect/io/ExecutionStrategy"
   * ```
   */
  ExecutionStrategy,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/io/modules/Exit.ts.html
   * - Module: "@effect/io/Exit"
   * ```
   */
  Exit,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/io/modules/Fiber.ts.html
   * - Module: "@effect/io/Fiber"
   * ```
   */
  Fiber,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/io/modules/FiberRef.ts.html
   * - Module: "@effect/io/FiberRef"
   * ```
   */
  FiberRef,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/io/modules/FiberRefs.ts.html
   * - Module: "@effect/io/FiberRefs"
   * ```
   */
  FiberRefs,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://fp-ts.github.io/data/modules/Function.ts.html
   * - Module: "@fp-ts/data/Function"
   * ```
   */
  flow,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://fp-ts.github.io/data/modules/Function.ts.html#hole
   * - Module: "@fp-ts/data/Function"
   * ```
   */
  hole,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/io/modules/Hub.ts.html
   * - Module: "@effect/io/Hub"
   * ```
   */
  Hub,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://fp-ts.github.io/data/modules/Function.ts.html#identity
   * - Module: "@fp-ts/data/Function"
   * ```
   */
  identity,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/io/modules/Layer.ts.html
   * - Module: "@effect/io/Layer"
   * ```
   */
  Layer,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/io/modules/Logger.ts.html
   * - Module: "@effect/io/Logger"
   * ```
   */
  Logger,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/io/modules/Metric.ts.html
   * - Module: "@effect/io/Metric"
   * ```
   */
  Metric,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://fp-ts.github.io/data/modules/Number.ts.html
   * - Module: "@fp-ts/data/Number"
   * ```
   */
  Number,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://fp-ts.github.io/optic/modules/index.ts.html
   * - Module: "@fp-ts/optic"
   * ```
   */
  Optic,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://fp-ts.github.io/data/modules/Option.ts.html
   * - Module: "@fp-ts/data/Option"
   * ```
   */
  Option,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://fp-ts.github.io/data/modules/Function.ts.html#pipe
   * - Module: "@fp-ts/data/Function"
   * ```
   */
  pipe,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://fp-ts.github.io/data/modules/Predicate.ts.html
   * - Module: "@fp-ts/data/Predicate"
   * ```
   */
  Predicate,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/io/modules/Queue.ts.html
   * - Module: "@effect/io/Queue"
   * ```
   */
  Queue,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/io/modules/Random.ts.html
   * - Module: "@effect/io/Random"
   * ```
   */
  Random,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/io/modules/Ref.ts.html
   * - Module: "@effect/io/Ref"
   * ```
   */
  Ref,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/io/modules/Reloadable.ts.html
   * - Module: "@effect/io/Reloadable"
   * ```
   */
  Reloadable,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/io/modules/Runtime.ts.html
   * - Module: "@effect/io/Runtime"
   * ```
   */
  Runtime,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/io/modules/Schedule.ts.html
   * - Module: "@effect/io/Schedule"
   * ```
   */
  Schedule,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/io/modules/Scope.ts.html
   * - Module: "@effect/io/Scope"
   * ```
   */
  Scope,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://fp-ts.github.io/data/modules/String.ts.html
   * - Module: "@fp-ts/data/String"
   * ```
   */
  String,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/io/modules/Supervisor.ts.html
   * - Module: "@effect/io/Supervisor"
   * ```
   */
  Supervisor,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/io/modules/Tracer.ts.html
   * - Module: "@effect/io/Tracer"
   * ```
   */
  Tracer,
  /**
   * @since 2.0.0
   */
  unsafeCoerce
}
