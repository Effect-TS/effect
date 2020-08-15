import * as M from "../src"

import * as T from "@matechs/preview/Effect"
import { flow, pipe } from "@matechs/preview/Function"
import * as X from "@matechs/preview/XPure"
import { chainF } from "@matechs/preview/_abstract/DSL/core"

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
          D.recover((e) => D.fail(["add err", ...e])),
          chainF(D)(() =>
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
      DecoderURI: ({ current, fail, recover }) =>
        flow(
          current,
          recover((e) => fail(["add err", ...e]))
        )
    }
  )
)

export const pureArray = pipe(["a", "b"], M.decodePure(stringArray))
export const mixArray = pipe(["a", "b"], M.decodeAsync(stringArray))
export const asyncArray = pipe(["a", "b"], M.decodeAsync(stringArrayAsync))

pipe(
  pureArray,
  X.provideAll({
    foo: "(foo-p)",
    bar: "(bar-p)",
    baz: "(baz-p)"
  }),
  X.runEither,
  console.log
)

pipe(asyncArray, T.runPromiseExit).then(console.log)

pipe(
  mixArray,
  T.provideAll({ foo: "(foo-e)", bar: "(bar-e)", baz: "(baz-e" }),
  T.runPromiseExit
).then(console.log)
