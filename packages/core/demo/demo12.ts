import * as A from "../src/Array"
import { pipe } from "../src/Function"
import * as T from "../src/next/Effect"
import * as L from "../src/next/Layer"
import * as S from "../src/next/Semaphore"

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
  constructor(private readonly format: Format) {
    super()
  }

  putStrLn(s: string): T.Sync<void> {
    return T.chain_(this.format.formatString(s), (f) =>
      T.provideService(HasFormat)(this.format)(
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
  T.accessService(HasFormat)((format) => new AugumentedConsole(format))
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

const program = pipe(
  S.makeSemaphore(2),
  T.chain((s) =>
    T.foreachPar_(A.range(0, 10), (n) =>
      S.withPermit(s)(T.delay(1000)(putStrLn(String(n))))
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

export const mainLayer = pipe(
  L.allPar(
    provideAppConfig,
    provideConsole,
    provideScopedAppConfig,
    provideNumberConfig
  ),
  L.using(provideAugumentedConsole),
  L.using(provideFormat)
)

pipe(program, T.provideSomeLayer(mainLayer), T.runMain)
