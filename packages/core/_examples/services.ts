export const makeLiveSystem = Do(($) => {
  return $(Effect.succeed({
    now: Effect.succeed(new Date())
  }))
})
export interface System extends Effect.Success<typeof makeLiveSystem> {}
export const System = Service.Tag<System>()
export const SystemLive = makeLiveSystem.toLayer(System)

export const makeLiveCounter = Do(($) => {
  let count = 0
  return $(Effect.succeed({
    get: Effect.succeed(count++)
  }))
})
export interface Counter extends Effect.Success<typeof makeLiveCounter> {}
export const Counter = Service.Tag<Counter>()
export const CounterLive = makeLiveCounter.toLayer(Counter)

export const makeLiveLogger = Do(($) => {
  const sys = $(Effect.service(System))
  const cnt = $(Effect.service(Counter))
  return $(Effect.succeed({
    info: (message: string) =>
      sys.now.zip(cnt.get).flatMap(({ tuple: [now, i] }) =>
        Effect.succeed(console.log(`[${now.toISOString()} - ${i}]: ${message}`))
      )
  }))
})
export interface Logger extends Effect.Success<typeof makeLiveLogger> {}
export const Logger = Service.Tag<Logger>()
export const LoggerLive = makeLiveLogger.toLayer(Logger)

export const ContextLive = (SystemLive + CounterLive) > LoggerLive

export const program = Do(($) => {
  const sys = $(Effect.service(System))
  const log = $(Effect.service(Logger))
  const now = $(sys.now)
  const later = $(sys.now)
  $(log.info(`now: ${now.toISOString()}`))
  $(now.getTime() > later.getTime() ? Effect.fail("no-way" as const) : Effect.unit)
  $(now.getTime() > later.getTime() ? Effect.fail("really-no-way" as const) : Effect.unit)
})

export const main = program.provideSomeLayer(ContextLive)

main.unsafeRunPromise().catch(console.error)
