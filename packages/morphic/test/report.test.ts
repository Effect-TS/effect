import { left } from "@effect-ts/core/Either"
import { pipe } from "@effect-ts/core/Function"
import * as S from "@effect-ts/core/Sync"

import type { AType, EType } from "../src"
import { DecoderURI, make, opaque } from "../src"
import { decoder, fail, report } from "../src/Decoder"
import { encoder } from "../src/Encoder"

const Id_ = make((F) =>
  F.interface({
    id: F.number({
      conf: {
        [DecoderURI]: (_) =>
          _.with((u, c) =>
            pipe(
              _.validate(u, c),
              S.catchAll(() => fail(u, c, "id should be an integer"))
            )
          )
      }
    })
  })
)

export interface Id extends AType<typeof Id_> {}
export interface IdRaw extends EType<typeof Id_> {}

export const Id = opaque<IdRaw, Id>()(Id_)

export const encodeId = encoder(Id).encode
export const decodeId = decoder(Id).decode

it("decodes id", () => {
  expect(
    S.runEither(
      report(
        decodeId({
          id: "bla"
        })
      )
    )
  ).toEqual(
    left(['Expecting Number at id but instead got: "bla" (id should be an integer)'])
  )
})
