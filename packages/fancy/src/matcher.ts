import {} from "morphic-ts/lib/batteries/summoner-no-union";
import { MatcherT } from "./matchers";
import { ProgramURI } from "morphic-ts/lib/usage/ProgramType";
import { InterpreterURI } from "morphic-ts/lib/usage/InterpreterResult";
import { MorphADT, AOfMorhpADT } from "morphic-ts/lib/usage/tagged-union";

// experimental alpha
/* istanbul ignore file */

export const matcher = <
  Types extends {
    [k in keyof Types]: [any, any];
  },
  Tag extends string,
  ProgURI extends ProgramURI,
  InterpURI extends InterpreterURI
>(
  adt: MorphADT<Types, Tag, ProgURI, InterpURI>
): MatcherT<AOfMorhpADT<typeof adt>, Tag> => (match: any) => (cont: any) => (
  a: any
): any => (match[a[adt.tag]] || match["default"])(a, cont);
