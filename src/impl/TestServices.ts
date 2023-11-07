/**
 * @since 2.0.0
 */
import { Context } from "../Context.js"
import type { DefaultServices } from "../DefaultServices.js"
import { Effect } from "../Effect.js"
import type { Fiber } from "../Fiber.js"
import type { FiberRef } from "../FiberRef.js"
import { dual, pipe } from "../Function.js"
import * as core from "../internal/core.js"
import * as defaultServices from "../internal/defaultServices.js"
import * as fiberRuntime from "../internal/fiberRuntime.js"
import * as layer from "../internal/layer.js"
import * as ref from "../internal/ref.js"
import type { Layer } from "../Layer.js"
import type { Scope } from "../Scope.js"
import type { SortedSet } from "../SortedSet.js"
import type { TestAnnotation } from "../TestAnnotation.js"
import { TestAnnotationMap } from "../TestAnnotationMap.js"
import * as Annotations from "../TestAnnotations.js"
import { TestConfig } from "../TestConfig.js"
import * as Live from "../TestLive.js"
import * as Sized from "../TestSized.js"

import type { TestServices } from "../TestServices.js"

/**
 * The default Effect test services.
 *
 * @since 2.0.0
 */
export const liveServices: Context<TestServices> = pipe(
  Context.make(Annotations.Tag, Annotations.make(ref.unsafeMake(TestAnnotationMap.empty()))),
  Context.add(Live.Tag, Live.make(defaultServices.liveServices)),
  Context.add(Sized.Tag, Sized.make(100)),
  Context.add(TestConfig.Tag, TestConfig.make({ repeats: 100, retries: 100, samples: 200, shrinks: 1000 }))
)

/**
 * @since 2.0.0
 */
export const currentServices: FiberRef<Context<TestServices>> = core.fiberRefUnsafeMakeContext(
  liveServices
)

/**
 * Retrieves the `Annotations` service for this test.
 *
 * @since 2.0.0
 */
export const annotations = (): Effect<never, never, Annotations.TestAnnotations> => annotationsWith(core.succeed)

/**
 * Retrieves the `Annotations` service for this test and uses it to run the
 * specified workflow.
 *
 * @since 2.0.0
 */
export const annotationsWith = <R, E, A>(
  f: (annotations: Annotations.TestAnnotations) => Effect<R, E, A>
): Effect<R, E, A> =>
  core.fiberRefGetWith(
    currentServices,
    (services) => f(Context.get(services, Annotations.Tag))
  )

/**
 * Executes the specified workflow with the specified implementation of the
 * annotations service.
 *
 * @since 2.0.0
 */
export const withAnnotations = dual<
  (annotations: Annotations.TestAnnotations) => <R, E, A>(effect: Effect<R, E, A>) => Effect<R, E, A>,
  <R, E, A>(effect: Effect<R, E, A>, annotations: Annotations.TestAnnotations) => Effect<R, E, A>
>(2, (effect, annotations) =>
  core.fiberRefLocallyWith(
    currentServices,
    Context.add(Annotations.Tag, annotations)
  )(effect))

/**
 * Sets the implementation of the annotations service to the specified value
 * and restores it to its original value when the scope is closed.
 *
 * @since 2.0.0
 */
export const withAnnotationsScoped = (
  annotations: Annotations.TestAnnotations
): Effect<Scope, never, void> =>
  fiberRuntime.fiberRefLocallyScopedWith(
    currentServices,
    Context.add(Annotations.Tag, annotations)
  )

/**
 * Constructs a new `Annotations` service wrapped in a layer.
 *
 * @since 2.0.0
 */
export const annotationsLayer = (): Layer<never, never, Annotations.TestAnnotations> =>
  layer.scoped(
    Annotations.Tag,
    pipe(
      core.sync(() => ref.unsafeMake(TestAnnotationMap.empty())),
      core.map(Annotations.make),
      core.tap(withAnnotationsScoped)
    )
  )

/**
 * Accesses an `Annotations` instance in the context and retrieves the
 * annotation of the specified type, or its default value if there is none.
 *
 * @since 2.0.0
 */
export const get = <A>(key: TestAnnotation<A>): Effect<never, never, A> =>
  annotationsWith((annotations) => annotations.get(key))

/**
 * Accesses an `Annotations` instance in the context and appends the
 * specified annotation to the annotation map.
 *
 * @since 2.0.0
 */
export const annotate = <A>(key: TestAnnotation<A>, value: A): Effect<never, never, void> =>
  annotationsWith((annotations) => annotations.annotate(key, value))

/**
 * Returns the set of all fibers in this test.
 *
 * @since 2.0.0
 */
export const supervisedFibers = (): Effect<
  never,
  never,
  SortedSet<Fiber.RuntimeFiber<unknown, unknown>>
> => annotationsWith((annotations) => annotations.supervisedFibers())

/**
 * Retrieves the `Live` service for this test and uses it to run the specified
 * workflow.
 *
 * @since 2.0.0
 */
export const liveWith = <R, E, A>(f: (live: Live.TestLive) => Effect<R, E, A>): Effect<R, E, A> =>
  core.fiberRefGetWith(currentServices, (services) => f(Context.get(services, Live.Tag)))

/**
 * Retrieves the `Live` service for this test.
 *
 * @since 2.0.0
 */
export const live: Effect<never, never, Live.TestLive> = liveWith(core.succeed)

/**
 * Executes the specified workflow with the specified implementation of the
 * live service.
 *
 * @since 2.0.0
 */
export const withLive = dual<
  (live: Live.TestLive) => <R, E, A>(effect: Effect<R, E, A>) => Effect<R, E, A>,
  <R, E, A>(effect: Effect<R, E, A>, live: Live.TestLive) => Effect<R, E, A>
>(2, (effect, live) =>
  core.fiberRefLocallyWith(
    currentServices,
    Context.add(Live.Tag, live)
  )(effect))

/**
 * Sets the implementation of the live service to the specified value and
 * restores it to its original value when the scope is closed.
 *
 * @since 2.0.0
 */
export const withLiveScoped = (live: Live.TestLive): Effect<Scope, never, void> =>
  fiberRuntime.fiberRefLocallyScopedWith(currentServices, Context.add(Live.Tag, live))

/**
 * Constructs a new `Live` service wrapped in a layer.
 *
 * @since 2.0.0
 */
export const liveLayer = (): Layer<DefaultServices, never, Live.TestLive> =>
  layer.scoped(
    Live.Tag,
    pipe(
      core.context<DefaultServices>(),
      core.map(Live.make),
      core.tap(withLiveScoped)
    )
  )

/**
 * Provides a workflow with the "live" default Effect services.
 *
 * @since 2.0.0
 */
export const provideLive = <R, E, A>(effect: Effect<R, E, A>): Effect<R, E, A> =>
  liveWith((live) => live.provide(effect))

/**
 * Runs a transformation function with the live default Effect services while
 * ensuring that the workflow itself is run with the test services.
 *
 * @since 2.0.0
 */
export const provideWithLive = dual<
  <R, E, A, R2, E2, A2>(
    f: (effect: Effect<R, E, A>) => Effect<R2, E2, A2>
  ) => (self: Effect<R, E, A>) => Effect<R | R2, E | E2, A2>,
  <R, E, A, R2, E2, A2>(
    self: Effect<R, E, A>,
    f: (effect: Effect<R, E, A>) => Effect<R2, E2, A2>
  ) => Effect<R | R2, E | E2, A2>
>(2, (self, f) =>
  core.fiberRefGetWith(
    defaultServices.currentServices,
    (services) => provideLive(f(core.fiberRefLocally(defaultServices.currentServices, services)(self)))
  ))

/**
 * Retrieves the `Sized` service for this test and uses it to run the
 * specified workflow.
 *
 * @since 2.0.0
 */
export const sizedWith = <R, E, A>(f: (sized: Sized.TestSized) => Effect<R, E, A>): Effect<R, E, A> =>
  core.fiberRefGetWith(
    currentServices,
    (services) => f(Context.get(services, Sized.Tag))
  )

/**
 * Retrieves the `Sized` service for this test.
 *
 * @since 2.0.0
 */
export const sized: Effect<never, never, Sized.TestSized> = sizedWith(core.succeed)

/**
 * Executes the specified workflow with the specified implementation of the
 * sized service.
 *
 * @since 2.0.0
 */
export const withSized = dual<
  (sized: Sized.TestSized) => <R, E, A>(effect: Effect<R, E, A>) => Effect<R, E, A>,
  <R, E, A>(effect: Effect<R, E, A>, sized: Sized.TestSized) => Effect<R, E, A>
>(2, (effect, sized) =>
  core.fiberRefLocallyWith(
    currentServices,
    Context.add(Sized.Tag, sized)
  )(effect))

/**
 * Sets the implementation of the sized service to the specified value and
 * restores it to its original value when the scope is closed.
 *
 * @since 2.0.0
 */
export const withSizedScoped = (sized: Sized.TestSized): Effect<Scope, never, void> =>
  fiberRuntime.fiberRefLocallyScopedWith(currentServices, Context.add(Sized.Tag, sized))

/**
 * @since 2.0.0
 */
export const sizedLayer = (size: number): Layer<never, never, Sized.TestSized> =>
  layer.scoped(
    Sized.Tag,
    pipe(
      fiberRuntime.fiberRefMake(size),
      core.map(Sized.fromFiberRef),
      core.tap(withSizedScoped)
    )
  )

/**
 * @since 2.0.0
 */
export const size: Effect<never, never, number> = sizedWith((sized) => sized.size())

/**
 * @since 2.0.0
 */
export const withSize = dual<
  (size: number) => <R, E, A>(effect: Effect<R, E, A>) => Effect<R, E, A>,
  <R, E, A>(effect: Effect<R, E, A>, size: number) => Effect<R, E, A>
>(2, (effect, size) => sizedWith((sized) => sized.withSize(size)(effect)))

/**
 * Retrieves the `TestConfig` service for this test and uses it to run the
 * specified workflow.
 *
 * @since 2.0.0
 */
export const testConfigWith = <R, E, A>(
  f: (config: TestConfig) => Effect<R, E, A>
): Effect<R, E, A> =>
  core.fiberRefGetWith(
    currentServices,
    (services) => f(Context.get(services, TestConfig.Tag))
  )

/**
 * Retrieves the `TestConfig` service for this test.
 *
 * @since 2.0.0
 */
export const testConfig: Effect<never, never, TestConfig> = testConfigWith(core.succeed)

/**
 * Executes the specified workflow with the specified implementation of the
 * config service.
 *
 * @since 2.0.0
 */
export const withTestConfig = dual<
  (config: TestConfig) => <R, E, A>(effect: Effect<R, E, A>) => Effect<R, E, A>,
  <R, E, A>(effect: Effect<R, E, A>, config: TestConfig) => Effect<R, E, A>
>(2, (effect, config) =>
  core.fiberRefLocallyWith(
    currentServices,
    Context.add(TestConfig.Tag, config)
  )(effect))

/**
 * Sets the implementation of the config service to the specified value and
 * restores it to its original value when the scope is closed.
 *
 * @since 2.0.0
 */
export const withTestConfigScoped = (config: TestConfig): Effect<Scope, never, void> =>
  fiberRuntime.fiberRefLocallyScopedWith(currentServices, Context.add(TestConfig.Tag, config))

/**
 * Constructs a new `TestConfig` service with the specified settings.
 *
 * @since 2.0.0
 */
export const testConfigLayer = (params: {
  readonly repeats: number
  readonly retries: number
  readonly samples: number
  readonly shrinks: number
}): Layer<never, never, TestConfig> =>
  layer.scoped(
    TestConfig.Tag,
    Effect.suspend(() => {
      const testConfig = TestConfig.make(params)
      return pipe(
        withTestConfigScoped(testConfig),
        core.as(testConfig)
      )
    })
  )

/**
 * The number of times to repeat tests to ensure they are stable.
 *
 * @since 2.0.0
 */
export const repeats: Effect<never, never, number> = testConfigWith((config) => core.succeed(config.repeats))

/**
 * The number of times to retry flaky tests.
 *
 * @since 2.0.0
 */
export const retries: Effect<never, never, number> = testConfigWith((config) => core.succeed(config.retries))

/**
 * The number of sufficient samples to check for a random variable.
 *
 * @since 2.0.0
 */
export const samples: Effect<never, never, number> = testConfigWith((config) => core.succeed(config.samples))

/**
 * The maximum number of shrinkings to minimize large failures.
 *
 * @since 2.0.0
 */
export const shrinks: Effect<never, never, number> = testConfigWith((config) => core.succeed(config.shrinks))
