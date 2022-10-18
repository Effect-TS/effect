const namedRef = FiberRef.unsafeMake("anonymous")

/**
 * @tsplus pipeable effect/core/io/Effect named
 */
export function named(name: string): <R, E, A>(self: Effect<R, E, A>) => Effect<R, E, A> {
  return namedRef.locally(name)
}

/**
 * @tsplus static effect/core/io/Effect.Ops getFiberName
 */
export const getFiberName = namedRef.get

const logFiberName = Effect.getFiberName.flatMap((name) => Effect.log(`name: ${name}`))

export const program = Do(($) => {
  const a = $(logFiberName.named("AAA").forkDaemon)
  const b = $(logFiberName.named("BBB").forkDaemon)
  $(a.join)
  $(b.join)
})

program.provideSomeLayer(Logger.layer(Logger.consoleLogger)).unsafeRunSync()
