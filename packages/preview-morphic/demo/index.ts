import * as M from "../src"

import * as T from "@matechs/preview/Effect"
import { flow, pipe } from "@matechs/preview/Function"
import * as X from "@matechs/preview/XPure"

interface Req {
  foo: string
}
interface Req2 {
  bar: string
}
interface Req3 {
  baz: string
}

export const stringArray = M.make((F) =>
  F.array(
    F.string({
      DecoderURI: (D) => (i) =>
        D.foldStack(
          ({ fromEffect }) =>
            fromEffect(T.accessM((_: Req) => T.die(`running on effect: ${_.foo}`))),
          () => D.current(i)
        ),
      EncoderURI: (E) => (_) =>
        E.fromXPure(X.accessM((_: Req3) => X.succeed(() => `oo: ${_.baz}`)))
    }),
    {
      DecoderURI: (D) =>
        flow(
          D.current,
          D.mapError((e) => ["add err", ...e]),
          D.chain(() =>
            D.fromXPure(X.accessM((_: Req2) => X.fail([`running on pure: ${_.bar}`])))
          )
        )
    }
  )
)

export const stringArrayAsync = M.makeAsync((F) =>
  F.array(
    F.string({
      DecoderURI: ({ fail }) => () => fail(["my bad"])
    }),
    {
      DecoderURI: ({ current, mapError }) =>
        flow(
          current,
          mapError((e) => ["add err", ...e])
        )
    }
  )
)

export const Person = M.make((F) =>
  F.required({
    first: F.string(),
    last: F.string()
  })
)

export const pureArray = pipe(["a", "b"], M.decodePure(stringArray))
export const mixArray = pipe(["a", "b"], M.decodeAsync(stringArray))
export const asyncArray = pipe(["a", "b"], M.decodeAsync(stringArrayAsync))

pipe(
  M.decodePure(Person)({
    first: "a",
    last: "b"
  }),
  X.runEither,
  (e) => {
    console.log(e)
  }
)
