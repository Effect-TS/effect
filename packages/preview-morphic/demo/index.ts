import * as M from "../src"

import * as T from "@matechs/preview/Effect"
import { flow, pipe } from "@matechs/preview/Function"
import * as X from "@matechs/preview/XPure"

export const stringArray = M.make((F) =>
  F.array(
    F.string({
      DecoderURI: (D) => (i) =>
        D.foldStack(
          ({ fromEffect }) => fromEffect(T.die("running on effect")),
          () => D.current(i)
        )
    }),
    {
      DecoderURI: (D) =>
        flow(
          D.current,
          D.recover((e) => D.fail(["add err", ...e]))
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

pipe(pureArray, X.runEither, console.log)

pipe(asyncArray, T.runPromiseExit).then(console.log)

pipe(mixArray, T.runPromiseExit).then(console.log)
