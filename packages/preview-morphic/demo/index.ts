import * as M from "../src"
import * as DE from "../src/decoder/Error"
import * as D from "../src/decoder/Sync"

import * as T from "@matechs/preview/Effect"
import * as E from "@matechs/preview/Either"
import { pipe } from "@matechs/preview/Function"

export interface Req {
  foo: string
}
export interface Req2 {
  bar: string
}
export interface Req3 {
  baz: string
}

export const Person = M.make((F) =>
  F.required({
    a: F.string(),
    b: F.string(),
    c: F.string(),
    d: F.string(),
    e: F.string()
  })
)

export const decoder = pipe(
  D.decoder(Person),
  D.map(({ a, b }) => `${a} - ${b}`)
)

pipe(
  decoder({
    a: 0,
    b: "b",
    c: 1,
    d: 0,
    e: {
      foo: "ok"
    }
  }),
  T.either,
  T.chain((e) =>
    T.effectTotal(() => {
      E.fold_(
        e,
        (err) => {
          console.log(DE.draw(err))
        },
        (res) => {
          console.log(res)
        }
      )
    })
  ),
  T.runSync
)
