/**
 * @tsplus static effect/core/io/FiberRef.Ops currentEnvironment
 */
export const currentEnvironment: FiberRef<Env<never>, (a: Env<never>) => Env<never>> = FiberRef.unsafeMake(Env.empty)
