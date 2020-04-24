import { MatcherT } from "./matchers";
import { ProgramURI } from "@morphic-ts/batteries/lib/usage/ProgramType";
import { InterpreterURI } from "@morphic-ts/batteries/lib/usage/InterpreterResult";
import { MorphADT, AOfMorhpADT } from "@morphic-ts/batteries/lib/usage/tagged-union";

export const matcher = <
  Types extends {
    [k in keyof Types]: [any, any];
  },
  Tag extends string,
  ProgURI extends ProgramURI,
  InterpURI extends InterpreterURI,
  Env
>(
  adt: MorphADT<Types, Tag, ProgURI, InterpURI, Env>
): MatcherT<AOfMorhpADT<typeof adt>, Tag> => adt.matchWiden as any;
