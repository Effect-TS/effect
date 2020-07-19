import * as A from "../src/Array"
import { pipe } from "../src/Function"
import * as T from "../src/next/Effect"
import * as L from "../src/next/Layer"
import * as S from "../src/next/Semaphore"

abstract class Console {
  abstract readonly putStrLn: (s: string) => T.Sync<void>
}
abstract class Format {
  abstract readonly formatString: (s: string) => T.Sync<string>
}
abstract class AppConfig<S> {
  abstract readonly config: S
}

export const HasConsole = T.has(Console)
export type HasConsole = T.HasType<typeof HasConsole>

export const HasFormat = T.has(Format)
export type HasFormat = T.HasType<typeof HasFormat>

export const HasStringConfig = T.has<AppConfig<string>>()
export type HasStringConfig = T.HasType<typeof HasStringConfig>

export const HasNumberConfig = T.has<AppConfig<number>>()
export type HasNumberConfig = T.HasType<typeof HasNumberConfig>

export const Core = T.region<"core", HasStringConfig>()
export type HasCoreConfig = T.HasType<typeof Core>

export const Second = T.region<"second", HasStringConfig>()
export type HasSecondAppConfig = T.HasType<typeof Second>

export const Third = T.region<"third", HasNumberConfig>()
export type HasThirdConfig = T.HasType<typeof Third>

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

export const complexAccess = pipe(
  T.of,
  T.bind("console", () => T.readService(HasConsole)),
  T.bind("app", () => T.readServiceIn(HasStringConfig)(Core)),
  T.bind("scoped", () => T.readServiceIn(HasStringConfig)(Second)),
  T.bind("number", () => T.readServiceIn(HasNumberConfig)(Third)),
  T.chain(({ app, console, number, scoped }) =>
    console.putStrLn(`${app.config} - (${scoped.config}) - (${number.config})`)
  )
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

export const provideAppConfig = pipe(
  L.service(HasStringConfig).fromEffect(
    T.effectTotal(
      () =>
        new (class extends AppConfig<string> {
          config = "ok"
        })()
    )
  ),
  L.region(Core)
)

export const provideNumberConfig = pipe(
  L.service(HasNumberConfig).fromEffect(
    T.effectTotal(
      () =>
        new (class extends AppConfig<number> {
          config = 1
        })()
    )
  ),
  L.region(Third)
)

export const provideScopedAppConfig = pipe(
  L.service(HasStringConfig).fromEffect(
    T.effectTotal(
      () =>
        new (class extends AppConfig<string> {
          config = "ok - scoped"
        })()
    )
  ),
  L.region(Second)
)

const appLayer = L.all(provideAppConfig, provideScopedAppConfig, provideNumberConfig)

const main = pipe(
  program,
  provideConsole,
  provideAugumentedConsole,
  provideFormat,
  T.provideSomeLayer(appLayer)
)

T.runMain(main)
