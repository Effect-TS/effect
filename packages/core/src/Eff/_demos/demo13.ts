import * as A from "../../Array"
import { pipe } from "../../Function"
import * as T from "../Effect"
import * as L from "../Layer"

abstract class Console {
  abstract putStrLn(s: string): T.Sync<void>
}
abstract class Format {
  abstract formatString(s: string): T.Sync<string>
}
abstract class AppConfig<S> {
  abstract readonly config: S
}

export const HasConsole = T.has(Console)()
export type HasConsole = T.HasType<typeof HasConsole>

export const HasFormat = T.has(Format)()
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
  constructor(private readonly format: Format) {
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
  new (class extends Format {
    formatString(s: string): T.Sync<string> {
      return T.effectTotal(() => `running: ${s}`)
    }
  })()
)

export const program = pipe(
  T.foreachParN_(2)(A.range(0, 10), (n) => T.delay(1000)(putStrLn(String(n)))),
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

let k = 0
export const printer = (n: number) =>
  L.monitor(
    T.forever(
      T.onInterrupt_(
        T.delay(1000)(
          T.suspend(() => {
            if (k > n) {
              return T.die("error")
            } else {
              return T.effectTotal(() => {
                k += 1
              })
            }
          })
        ),
        () =>
          n > 5
            ? T.die("interruption error")
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
  L.using(L.allPar(printer(4), printer(10), printer(20), printer(20)))
)

pipe(program, T.provideSomeLayer(mainLayer), T.runMain)
