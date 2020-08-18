import * as M from "../src"
import * as DE from "../src/decoder/Error"
import * as D from "../src/decoder/Sync"

import * as T from "@matechs/preview/Effect"
import * as E from "@matechs/preview/Either"
import { flow, pipe } from "@matechs/preview/Function"
import { sequenceSF } from "@matechs/preview/_abstract/DSL"

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
  F.required(
    {
      a: F.string({
        DecoderURI: ({ accessM, current, recover, succeed }) =>
          flow(
            current,
            recover(() => accessM((_: Req) => succeed(`fallback: (${_.foo})`)))
          )
      }),
      b: F.string(),
      c: F.string(),
      d: F.string(),
      e: F.string()
    },
    {
      DecoderURI: (_) => (i) =>
        sequenceSF(_)()({
          a: _.accessM((__: Req3) => _.child.a((i as any)["a"])),
          b: _.accessM((__: Req2) => _.child.b((i as any)["b"])),
          c: _.child.c((i as any)["c"]),
          d: _.child.d((i as any)["d"]),
          e: _.child.e((i as any)["e"])
        })
    }
  )
)

export const decodePerson = D.decoder(Person)

pipe(
  decodePerson({
    a: 0,
    b: "b",
    c: "c",
    d: "d",
    e: "e"
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
  T.provideAll<Req & Req2 & Req3>({
    foo: "foo",
    bar: "bar",
    baz: "sss"
  }),
  T.runSync
)
