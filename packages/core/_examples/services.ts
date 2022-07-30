export const makeLiveSystem = () => {
  return {
    now: Effect.sync(new Date())
  }
}
export interface System extends ReturnType<typeof makeLiveSystem> {}
export const System = Service.Tag<System>()
export const SystemLive = Layer.fromValue(System, makeLiveSystem)

export const makeLiveCounter = Do(($) => {
  const countRef = $(Ref.make(0))
  return {
    get: countRef.updateAndGet((count) => count + 1)
  }
})
export interface Counter extends Effect.Success<typeof makeLiveCounter> {}
export const Counter = Service.Tag<Counter>()
export const CounterLive = makeLiveCounter.toLayer(Counter)

export const makeLiveLogger = Do(($) => {
  const sys = $(Effect.service(System))
  const cnt = $(Effect.service(Counter))
  return {
    info: (message: string) =>
      sys.now.zip(cnt.get).flatMap(({ tuple: [now, i] }) =>
        Effect.sync(console.log(`[${now.toISOString()} - ${i}]: ${message}`))
      )
  }
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
  $(now.getTime() > later.getTime() ? Effect.failSync("no-way" as const) : Effect.unit)
  $(now.getTime() > later.getTime() ? Effect.failSync("really-no-way" as const) : Effect.unit)
})

export const main = program.provideSomeLayer(ContextLive)

main.unsafeRunPromise().catch(console.error)
