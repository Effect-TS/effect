import type * as Chunk from "../Chunk.js"
import type * as Clock from "../Clock.js"
import type * as Config from "../Config.js"
import type * as ConfigProvider from "../ConfigProvider.js"
import * as Context from "../Context.js"
import type * as DefaultServices from "../DefaultServices.js"
import * as Duration from "../Duration.js"
import type * as Effect from "../Effect.js"
import { dual, pipe } from "../Function.js"
import { globalValue } from "../GlobalValue.js"
import type * as Random from "../Random.js"
import type * as Tracer from "../Tracer.js"
import * as clock from "./clock.js"
import * as configProvider from "./configProvider.js"
import * as core from "./core.js"
import * as console_ from "./defaultServices/console.js"
import * as random from "./random.js"
import * as tracer from "./tracer.js"

/** @internal */
export const liveServices: Context.Context<DefaultServices.DefaultServices> = pipe(
  Context.empty(),
  Context.add(clock.clockTag, clock.make()),
  Context.add(console_.consoleTag, console_.defaultConsole),
  Context.add(random.randomTag, random.make((Math.random() * 4294967296) >>> 0)),
  Context.add(configProvider.configProviderTag, configProvider.fromEnv()),
  Context.add(tracer.tracerTag, tracer.nativeTracer)
)

/**
 * The `FiberRef` holding the default `Effect` services.
 *
 * @since 2.0.0
 * @category fiberRefs
 */
export const currentServices = globalValue(
  Symbol.for("effect/DefaultServices/currentServices"),
  () => core.fiberRefUnsafeMakeContext(liveServices)
)

// circular with Clock

/** @internal */
export const sleep = (duration: Duration.DurationInput): Effect.Effect<never, never, void> => {
  const decodedDuration = Duration.decode(duration)
  return clockWith((clock) => clock.sleep(decodedDuration))
}

/** @internal */
export const clockWith = <R, E, A>(f: (clock: Clock.Clock) => Effect.Effect<R, E, A>): Effect.Effect<R, E, A> =>
  core.fiberRefGetWith(currentServices, (services) => f(Context.get(services, clock.clockTag)))

/** @internal */
export const currentTimeMillis: Effect.Effect<never, never, number> = clockWith((clock) => clock.currentTimeMillis)

/** @internal */
export const currentTimeNanos: Effect.Effect<never, never, bigint> = clockWith((clock) => clock.currentTimeNanos)

/** @internal */
export const withClock = dual<
  <A extends Clock.Clock>(value: A) => <R, E, A>(effect: Effect.Effect<R, E, A>) => Effect.Effect<R, E, A>,
  <R, E, A extends Clock.Clock>(effect: Effect.Effect<R, E, A>, value: A) => Effect.Effect<R, E, A>
>(2, (effect, value) =>
  core.fiberRefLocallyWith(
    currentServices,
    Context.add(clock.clockTag, value)
  )(effect))

// circular with ConfigProvider

/** @internal */
export const withConfigProvider = dual<
  (value: ConfigProvider.ConfigProvider) => <R, E, A>(effect: Effect.Effect<R, E, A>) => Effect.Effect<R, E, A>,
  <R, E, A>(effect: Effect.Effect<R, E, A>, value: ConfigProvider.ConfigProvider) => Effect.Effect<R, E, A>
>(2, (effect, value) =>
  core.fiberRefLocallyWith(
    currentServices,
    Context.add(configProvider.configProviderTag, value)
  )(effect))

/** @internal */
export const configProviderWith = <R, E, A>(
  f: (configProvider: ConfigProvider.ConfigProvider) => Effect.Effect<R, E, A>
): Effect.Effect<R, E, A> =>
  core.fiberRefGetWith(
    currentServices,
    (services) => f(Context.get(services, configProvider.configProviderTag))
  )

/** @internal */
export const config = <A>(config: Config.Config<A>) => configProviderWith((_) => _.load(config))

/** @internal */
export const configOrDie = <A>(config: Config.Config<A>) => core.orDie(configProviderWith((_) => _.load(config)))

// circular with Random

/** @internal */
export const randomWith = <R, E, A>(f: (random: Random.Random) => Effect.Effect<R, E, A>): Effect.Effect<R, E, A> =>
  core.fiberRefGetWith(
    currentServices,
    (services) => f(Context.get(services, random.randomTag))
  )

/** @internal */
export const next: Effect.Effect<never, never, number> = randomWith((random) => random.next)

/** @internal */
export const nextInt: Effect.Effect<never, never, number> = randomWith((random) => random.nextInt)

/** @internal */
export const nextBoolean: Effect.Effect<never, never, boolean> = randomWith((random) => random.nextBoolean)

/** @internal */
export const nextRange = (min: number, max: number): Effect.Effect<never, never, number> =>
  randomWith((random) => random.nextRange(min, max))

/** @internal */
export const nextIntBetween = (min: number, max: number): Effect.Effect<never, never, number> =>
  randomWith((random) => random.nextIntBetween(min, max))

/** @internal */
export const shuffle = <A>(elements: Iterable<A>): Effect.Effect<never, never, Chunk.Chunk<A>> =>
  randomWith((random) => random.shuffle(elements))

// circular with Tracer

/** @internal */
export const tracerWith = <R, E, A>(f: (tracer: Tracer.Tracer) => Effect.Effect<R, E, A>): Effect.Effect<R, E, A> =>
  core.fiberRefGetWith(currentServices, (services) => f(Context.get(services, tracer.tracerTag)))

/** @internal */
export const withTracer = dual<
  (value: Tracer.Tracer) => <R, E, A>(effect: Effect.Effect<R, E, A>) => Effect.Effect<R, E, A>,
  <R, E, A>(effect: Effect.Effect<R, E, A>, value: Tracer.Tracer) => Effect.Effect<R, E, A>
>(2, (effect, value) =>
  core.fiberRefLocallyWith(
    currentServices,
    Context.add(tracer.tracerTag, value)
  )(effect))
