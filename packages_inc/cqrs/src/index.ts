import { Domain } from "./domain"

import { InterpreterURI } from "@matechs/morphic/batteries/usage/interpreter-result"
import { ProgramURI } from "@matechs/morphic/batteries/usage/program-type"
import { MorphADT } from "@matechs/morphic/batteries/usage/tagged-union"

// experimental alpha
/* istanbul ignore file */

export function cqrs<
  Types extends {
    [k in keyof Types]: [any, any]
  },
  Tag extends string,
  ProgURI extends ProgramURI,
  InterpURI extends InterpreterURI,
  Db extends symbol | string,
  Env
>(S: MorphADT<Types, Tag, ProgURI, InterpURI, Env>, dbURI: Db) {
  return new Domain(S, dbURI)
}

export { EventLog } from "./eventLog"
export { ReadSideConfig } from "./config"
export { EventMetaHidden, metaURI } from "./read"
export { Aggregate } from "./aggregate"
export { matcher } from "./matcher"
