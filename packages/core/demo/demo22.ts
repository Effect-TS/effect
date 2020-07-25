import { pipe } from "fp-ts/lib/pipeable"

import * as T from "../src/next/Effect"
import * as L from "../src/next/Layer"

export interface Console {
  readonly log: (message: string) => T.UIO<void>
}

export const HasConsole = T.has<Console>()

export interface Hello {
  readonly hello: (name: string) => T.UIO<void>
}

export const HasHello = T.has<Hello>()

export const Console = L.service(HasConsole).pure(
  new (class implements Console {
    log = (message: string) =>
      T.effectTotal(() => {
        console.log(message)
      })
  })()
)

export const Hello = L.service(HasHello).fromEffect(
  T.accessService(HasConsole)(
    (console) =>
      new (class implements Hello {
        hello = (name: string) => T.delay_(console.log(`hi ${name}!`), 200)
      })()
  )
)

export const hello = T.accessServiceF(HasHello)("hello")

export const env = pipe(Hello, L.using(Console))

pipe(hello("mike"), T.provideSomeLayer(env), T.runMain)
