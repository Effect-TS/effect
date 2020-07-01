import * as A from "../../Array"
import { pipe } from "../../Function"
import * as T from "../Effect"
import * as S from "../Semaphore"

class Console {
  constructor(readonly putStrLn: (s: string) => T.Sync<void>) {}
}
class Format {
  constructor(readonly formatString: (s: string) => T.Sync<string>) {}
}
class AppConfig {
  constructor(readonly config: string) {}
}

export const HasConsole = T.hasClass(Console)
export const HasFormat = T.hasClass(Format)
export const HasAppConfig = T.hasClass(AppConfig)

export const ScopedAppConfigURI = "@matechs/core/Eff/_demos/ScopedAppConfigURI" as const
export const HasScopedAppConfig = T.hasScoped(ScopedAppConfigURI)(HasAppConfig)

export const putStrLn = (s: string) =>
  T.accessServiceM(HasConsole)((console) => console.putStrLn(s))

export const provideConsole = T.provideServiceM(HasConsole)(
  T.accessService(HasFormat)(
    (format) =>
      new Console((s) =>
        T.chain_(format.formatString(s), (f) =>
          T.effectTotal(() => {
            console.log(f)
          })
        )
      )
  )
)

export const complexAccess = T.accessServicesM({
  console: HasConsole,
  app: HasAppConfig,
  scoped: HasScopedAppConfig
})(({ app, console, scoped }) => console.putStrLn(`${app.config} - (${scoped.config})`))

export const provideFormat = T.provideServiceM(HasFormat)(
  T.effectTotal(() => new Format((s) => T.effectTotal(() => `running: ${s}`)))
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
  T.succeedNow(new AppConfig("ok"))
)
export const provideScopedAppConfig = T.provideServiceM(HasScopedAppConfig)(
  T.succeedNow(new AppConfig("ok-scoped"))
)

const main = pipe(
  program,
  provideConsole,
  provideFormat,
  provideAppConfig,
  provideScopedAppConfig
)

T.runMain(main)
