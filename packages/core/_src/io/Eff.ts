/**
 * @tsplus type Eff
 */
export interface Eff<R, E, A> {
  _R: () => R
  _E: () => E
  _A: () => A
}

/**
 * @tsplus type Eff.Ops
 */
export interface EffOps {}
export const Eff: EffOps = {}

/**
 * @tsplus static Eff.Ops succeed
 */
export declare function succeed<A>(success: LazyArg<A>): Eff<never, never, A>

/**
 * @tsplus static Eff.Ops fail
 */
export declare function fail<E>(failure: LazyArg<E>): Eff<never, E, never>

/**
 * @tsplus static Eff.Ops service
 */
export declare function service<S>(tag: Tag<S>): Eff<S, never, S>

/**
 * @tsplus fluent Eff map
 */
export declare function map<R, E, A, B>(self: Eff<R, E, A>, f: (a: A) => B): Eff<R, E, B>

/**
 * @tsplus fluent Eff flatMap
 */
export declare function flatMap<R, E, A, R1, E1, B>(
  self: Eff<R, E, A>,
  f: (a: A) => Eff<R1, E1, B>
): Eff<R | R1, E | E1, B>

/**
 * @tsplus fluent Eff provideService
 */
export declare function provideService<R, E, A, S>(
  self: Eff<R, E, A>,
  tag: Tag<S>,
  service: LazyArg<S>
): Eff<Exclude<R, S>, E, A>

/**
 * @tsplus fluent Eff run
 * @tsplus static Eff.Ops run
 */
export declare function run<E, A>(
  self: Eff<never, E, A>
): void

export interface Logger {
  log: (message: string) => Eff<never, never, void>
}
export const Logger = Tag<Logger>()

export interface System {
  time: Eff<never, never, Date>
}
export const System = Tag<System>()

// Eff<Logger | System, never, void>
export const program = Do(($) => {
  const system = $(Eff.service(System))
  const logger = $(Eff.service(Logger))
  const now = $(system.time)
  $(logger.log(`now: ${now.toISOString()}`))
})

// Eff<never, never, void>
export const main = program
  .provideService(System, () => ({ time: Eff.succeed(new Date()) }))
  .provideService(Logger, () => ({ log: (m) => Eff.succeed(console.log(m)) }))

Eff.run(main)
