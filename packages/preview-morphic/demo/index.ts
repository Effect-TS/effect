import * as M from "../src"
import * as DE from "../src/decodeError"

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

pipe(
  M.decodeSync(Person)({
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
          console.log(DE.prettyStr(err))
        },
        (res) => {
          console.log(res)
        }
      )
    })
  ),
  T.runSync
)
