import { pipe } from "@effect-ts/core/Function"

import type { RecordURI } from "../../Algebra/Record"
import { isUnknownRecord } from "../../Guard/interpreter/common"
import { interpreter } from "../../HKT"
import { decoderApplyConfig, DecoderType, DecoderURI } from "../base"
import { appendContext, fail, makeDecoder } from "../common"
import { foreachRecordWithIndex } from "./common"

export const decoderRecordInterpreter = interpreter<DecoderURI, RecordURI>()(() => ({
  _F: DecoderURI,
  record: (getCodomain, cfg) => (env) =>
    pipe(
      getCodomain(env).decoder,
      (decoder) =>
        new DecoderType(
          decoderApplyConfig(cfg?.conf)(
            makeDecoder(
              (u, c) =>
                isUnknownRecord(u)
                  ? foreachRecordWithIndex((k, a) =>
                      decoder.validate(a, appendContext(c, k, decoder, u))
                    )(u)
                  : fail(u, c, `${typeof u} is not a record`),
              "record",
              cfg?.name || "Record"
            ),
            env,
            { decoder }
          )
        )
    )
}))
