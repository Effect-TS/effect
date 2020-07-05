import { pipe } from "../../Function"
import * as T from "../Effect"
import * as F from "../FiberRef"
import * as L from "../Layer"

abstract class Console {
  abstract putStrLn(s: string): T.Sync<void>
}
abstract class Format<F> {
  abstract formatString(s: F): T.Sync<F>
}
abstract class AppConfig<S> {
  abstract readonly config: S
}

export const HasConsole = T.has(Console)()
export type HasConsole = T.HasType<typeof HasConsole>

export const HasFormat = T.has(Format)().refine<Format<string>>()
export type HasFormat = T.HasType<typeof HasFormat>

export const HasAppConfig = T.has<AppConfig<string>>()()
export type HasAppConfig = T.HasType<typeof HasAppConfig>

export const HasScopedAppConfig = T.has<AppConfig<string>>()("Scoped")
export type HasScopedAppConfig = T.HasType<typeof HasScopedAppConfig>

export const HasNumberConfig = T.has<AppConfig<number>>()("Number")
export type HasNumberConfig = T.HasType<typeof HasNumberConfig>

export const putStrLn = (s: string) =>
  T.accessServiceM(HasConsole)((console) => console.putStrLn(s))

export const formatString = (s: string) =>
  T.accessServiceM(HasFormat)((f) => f.formatString(s))

export class LiveConsole extends Console {
  constructor(private readonly format: Format<string>) {
    super()
  }

  putStrLn(s: string): T.Sync<void> {
    return T.chain_(this.format.formatString(s), (f) =>
      T.provideService(HasFormat)(this.format)(
        T.effectTotal(() => {
          console.log(f)
        })
      )
    )
  }
}

export class AugumentedConsole extends Console {
  constructor(private readonly runtime: T.Runtime<HasFormat>) {
    super()
  }

  putStrLn(s: string): T.Sync<void> {
    return this.runtime.in(
      T.chain_(formatString(s), (f) =>
        T.effectTotal(() => {
          console.log("(augumented) ", f)
        })
      )
    )
  }
}

export const provideConsole = L.service(HasConsole.overridable()).fromEffect(
  T.accessService(HasFormat)((format) => new LiveConsole(format))
)

export const provideAugumentedConsole = L.service(HasConsole.overridable()).fromEffect(
  T.withRuntime((runtime: T.Runtime<HasFormat>) => new AugumentedConsole(runtime))
)

export const complexAccess: T.SyncR<
  HasConsole & HasAppConfig & HasScopedAppConfig & HasNumberConfig,
  void
> = T.accessServicesM({
  console: HasConsole,
  app: HasAppConfig,
  scoped: HasScopedAppConfig,
  numberConfig: HasNumberConfig
})(({ app, console, numberConfig, scoped }) =>
  console.putStrLn(`${app.config} - (${scoped.config}) - (${numberConfig.config})`)
)

export const provideFormat = L.service(HasFormat).pure(
  new (class extends Format<string> {
    formatString(s: string): T.Sync<string> {
      return T.effectTotal(() => `running: ${s}`)
    }
  })()
)

const hasPrinter0 = L.hasProcess("printer-0")<never, void>()
const hasPrinter1 = L.hasProcess("printer-1")<never, void>()
const hasPrinter2 = L.hasProcess("printer-2")<never, void>()
const hasPrinter3 = L.hasProcess("printer-3")<never, void>()

const metrics = F.unsafeMake(
  { counter: 0 },
  (a) => a,
  (a, b) => ({ counter: a.counter + b.counter })
)

export const program = pipe(
  T.forever(
    T.delay(1000)(
      T.sequenceT(
        T.accessServiceM(hasPrinter0)((f) =>
          T.chain_(f._FIBER.getRef(metrics), (c) =>
            putStrLn(
              `#${f._FIBER.id.seqNumber} - ${f._FIBER.state.get._tag} (${c.counter})`
            )
          )
        ),
        T.accessServiceM(hasPrinter1)((f) =>
          putStrLn(`#${f._FIBER.id.seqNumber} - ${f._FIBER.state.get._tag}`)
        ),
        T.accessServiceM(hasPrinter2)((f) =>
          putStrLn(`#${f._FIBER.id.seqNumber} - ${f._FIBER.state.get._tag}`)
        ),
        T.accessServiceM(hasPrinter3)((f) =>
          putStrLn(`#${f._FIBER.id.seqNumber} - ${f._FIBER.state.get._tag}`)
        )
      )
    )
  ),
  T.chain(() => complexAccess)
)

export const provideAppConfig = L.service(HasAppConfig).pure(
  new (class extends AppConfig<string> {
    config = "ok"
  })()
)

export const provideNumberConfig = L.service(HasNumberConfig).pure(
  new (class extends AppConfig<number> {
    config = 1
  })()
)

export const provideScopedAppConfig = L.service(HasScopedAppConfig).pure(
  new (class extends AppConfig<string> {
    config = "ok - scoped"
  })()
)

export const printer = <ID extends string>(
  has: L.HasProcess<ID, never, void>,
  n: number
) =>
  L.makeProcess(has)(
    T.forever(
      T.onInterrupt_(
        pipe(
          metrics,
          F.update(({ counter }) => ({ counter: counter + 1 })),
          T.delay(200)
        ),
        () =>
          n > 1
            ? T.die(`interruption error: ${n}`)
            : T.effectTotal(() => {
                console.log("interrupted")
              })
      )
    )
  )

export const mainLayer = pipe(
  L.all(provideAppConfig, provideConsole, provideScopedAppConfig, provideNumberConfig),
  L.using(provideAugumentedConsole),
  L.using(provideFormat),
  L.using(
    L.allPar(
      printer(hasPrinter0, 1),
      printer(hasPrinter1, 2),
      printer(hasPrinter2, 3),
      printer(hasPrinter3, 4)
    )
  )
)

const cancel = pipe(program, T.provideSomeLayer(mainLayer), T.runMain)

process.on("SIGINT", () => {
  cancel()
})
process.on("SIGTERM", () => {
  cancel()
})
