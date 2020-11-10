import * as S from "@effect-ts/core/Classic/Set"
import { pipe } from "@effect-ts/core/Function"
import * as T from "@effect-ts/core/Sync"

import type { SetURI } from "../../Algebra/Set"
import { interpreter } from "../../HKT"
import { decoderApplyConfig, DecoderType, DecoderURI } from "../base"
import { appendContext, fail, makeDecoder } from "../common"
import { foreachArray } from "./common"

export const decoderSetInterpreter = interpreter<DecoderURI, SetURI>()(() => ({
  _F: DecoderURI,
  set: (a, _, cfg) => (env) =>
    pipe(
      a(env).decoder,
      (decoder) =>
        new DecoderType(
          decoderApplyConfig(cfg?.conf)(
            makeDecoder(
              (u, c) =>
                Array.isArray(u)
                  ? pipe(
                      u,
                      foreachArray((k, a) =>
                        decoder.validate(a, appendContext(c, String(k), decoder, a))
                      ),
                      T.map(S.fromArray(_))
                    )
                  : fail(u, c, `${typeof u} is not a Set`),
              "set",
              cfg?.name || "Set"
            ),
            env,
            { decoder }
          )
        )
    )
}))
