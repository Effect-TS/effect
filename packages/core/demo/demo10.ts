import * as A from "../src/Array"
import { pipe } from "../src/Function"
import * as T from "../src/next/Effect"
import * as S from "../src/next/Semaphore"

abstract class Console {
  abstract readonly putStrLn: (s: string) => T.Sync<void>
}
abstract class Format {
  abstract readonly formatString: (s: string) => T.Sync<string>
}
abstract class AppConfig<S, K> {
  readonly _K!: K
  abstract readonly config: S
}

export const HasConsole = T.has(Console)
export type HasConsole = T.HasType<typeof HasConsole>

export const HasFormat = T.has(Format)
export type HasFormat = T.HasType<typeof HasFormat>

export const HasAppConfig = T.has<AppConfig<string, "core">>()
export type HasAppConfig = T.HasType<typeof HasAppConfig>

export const HasScopedAppConfig = T.has<AppConfig<string, "scoped">>()
export type HasScopedAppConfig = T.HasType<typeof HasScopedAppConfig>

export const HasNumberConfig = T.has<AppConfig<number, "number">>()
export type HasNumberConfig = T.HasType<typeof HasNumberConfig>

export const putStrLn = (s: string) =>
  T.accessServiceM(HasConsole)((console) => console.putStrLn(s))

export class LiveConsole extends Console {
  constructor(private readonly format: Format) {
    super()
  }

  putStrLn: (s: string) => T.Sync<void> = (s) =>
    T.chain_(this.format.formatString(s), (f) =>
      T.provideService(HasFormat)(this.format)(
        T.effectTotal(() => {
          console.log(f)
        })
      )
    )
}

export class AugumentedConsole extends Console {
  constructor(private readonly format: Format) {
    super()
  }

  putStrLn: (s: string) => T.Sync<void> = (s) =>
    T.chain_(this.format.formatString(s), (f) =>
      T.provideService(HasFormat)(this.format)(
        T.effectTotal(() => {
          console.log("(augumented) ", f)
        })
      )
    )
}

export const provideConsole = T.provideServiceM(HasConsole.overridable())(
  T.accessService(HasFormat)((format) => new LiveConsole(format))
)

export const provideAugumentedConsole = T.provideServiceM(HasConsole.overridable())(
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

export const provideFormat = T.provideServiceM(HasFormat)(
  T.effectTotal(
    () =>
      new (class extends Format {
        formatString: (s: string) => T.Sync<string> = (s) =>
          T.effectTotal(() => `running: ${s}`)
      })()
  )
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

export const provideAppConfig = T.provideServiceM(HasAppConfig)(
  T.succeedNow(
    new (class extends AppConfig<string, "core"> {
      config = "ok"
    })()
  )
)

export const provideNumberConfig = T.provideServiceM(HasNumberConfig)(
  T.succeedNow(
    new (class extends AppConfig<number, "number"> {
      config = 1
    })()
  )
)

export const provideScopedAppConfig = T.provideServiceM(HasScopedAppConfig)(
  T.succeedNow(
    new (class extends AppConfig<string, "scoped"> {
      config = "ok - scoped"
    })()
  )
)

const main = pipe(
  program,
  provideConsole,
  provideAppConfig,
  provideScopedAppConfig,
  provideNumberConfig,
  provideAugumentedConsole,
  provideFormat
)

T.runMain(main)
