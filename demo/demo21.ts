import { pipe } from "../src/Function"
import * as T from "../src/next/Effect"
import * as Has from "../src/next/Has"
import * as L from "../src/next/Layer"

export interface Prefix {
  readonly hi: string
}

export const HasPrefix = Has.has<Prefix>()

export interface Console {
  readonly log: (message: string) => T.SyncR<T.DefaultEnv, void>
}

export const HasConsole = Has.has<Console>()

export interface Hello {
  readonly hello: (name: string) => T.AsyncR<T.DefaultEnv, void>
}

export const HasHello = Has.has<Hello>()

export const Console = L.service(HasConsole).pure(
  new (class implements Console {
    log = (message: string) =>
      T.effectTotal(() => {
        console.log(message)
      })
  })()
)

export const Prefix = L.service(HasPrefix).pure({
  hi: "hi"
})

export const Hello = L.service(HasHello)
  .prepare(
    T.accessServicesT(
      HasConsole,
      HasPrefix
    )(
      (console, prefix) =>
        new (class implements Hello {
          hello = (name: string): T.AsyncR<T.DefaultEnv, void> =>
            T.delay_(console.log(`${prefix.hi} ${name}!`), 200)

          close = T.suspend(() => console.log("close"))
        })()
    )
  )
  .release((h) => h.close)

export const hello = T.accessServiceF(HasHello)("hello")

export const env = pipe(Hello, L.using(L.allPar(Console, Prefix)))

pipe(hello("mike"), T.provideSomeLayer(env), T.runMain)
