import { pipe } from "@effect-ts/core/Function"

import type { RecordURI } from "../../Algebra/Record"
import { isUnknownRecord } from "../../Guard/interpreter/common"
import { interpreter } from "../../HKT"
import { decoderApplyConfig, DecoderType, DecoderURI } from "../base"
import { fail } from "../common"
import { foreachRecordWithIndex } from "./common"

export const decoderRecordInterpreter = interpreter<DecoderURI, RecordURI>()(() => ({
  _F: DecoderURI,
  record: (getCodomain, cfg) => (env) =>
    pipe(
      getCodomain(env).decoder,
      (decoder) =>
        new DecoderType(
          decoderApplyConfig(cfg?.conf)(
            {
              validate: (u, c) =>
                isUnknownRecord(u)
                  ? foreachRecordWithIndex((k, a) =>
                      decoder.validate(a, {
                        key: `${c.key}.${k}`,
                        actual: u,
                        types: cfg?.name ? [...c.types, cfg.name] : c.types
                      })
                    )(u)
                  : fail([
                      {
                        id: cfg?.id,
                        name: cfg?.name,
                        message: `${typeof u} is not a record`,
                        context: {
                          ...c,
                          actual: u,
                          types: cfg?.name ? [...c.types, cfg.name] : c.types
                        }
                      }
                    ])
            },
            env,
            { decoder }
          )
        )
    )
}))
