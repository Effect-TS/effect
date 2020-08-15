import * as M from "../src"

import * as T from "@matechs/preview/Effect"
import { flow, pipe } from "@matechs/preview/Function"

const stringArray = M.make((F) =>
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

export const stringString = M.make((F) => F.array(stringArray(F)))

const eitherArray = pipe(["a", "b"], M.decodeEither(stringArray))
const effectArray = pipe(["a", "b"], M.decodeEffectAsync(stringArray))

console.log(eitherArray)

pipe(
  effectArray,
  T.chain((a) =>
    T.effectTotal(() => {
      console.log(a)
    })
  ),
  T.catchAll((e) =>
    T.effectTotal(() => {
      console.log(e)
    })
  ),
  T.runMain
)
