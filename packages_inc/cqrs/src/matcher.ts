import { MatcherT } from "./matchers"

import { InterpreterURI } from "@matechs/morphic/batteries/usage/interpreter-result"
import { ProgramURI } from "@matechs/morphic/batteries/usage/program-type"
import { MorphADT, AOfMorhpADT } from "@matechs/morphic/batteries/usage/tagged-union"

export const matcher = <
  Types extends {
    [k in keyof Types]: [any, any]
  },
  Tag extends string,
  ProgURI extends ProgramURI,
  InterpURI extends InterpreterURI,
  Env
>(
  adt: MorphADT<Types, Tag, ProgURI, InterpURI, Env>
): MatcherT<AOfMorhpADT<typeof adt>, Tag> => adt.match as any
