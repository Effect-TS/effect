import {
  AsOpaque,
  AsUOpaque,
  M,
  Summoner,
  summonFor,
  UM
} from "@morphic-ts/batteries/lib/summoner-ESBST";
import { EqURI } from "@morphic-ts/eq-interpreters/lib/config";
import { FastCheckURI } from "@morphic-ts/fastcheck-interpreters/lib/config";
import { modelFastCheckInterpreter as fc } from "@morphic-ts/fastcheck-interpreters/lib/interpreters";
import { IoTsURI } from "@morphic-ts/io-ts-interpreters/lib/config";
import { ShowURI } from "@morphic-ts/show-interpreters/lib/config";

export { AsOpaque, AsUOpaque, M, Summoner, UM, summonFor, EqURI, IoTsURI, FastCheckURI, ShowURI };

export const arb = <Env, E, A>(F: M<Env, E, A>) => (
  _: { [k in "FastCheckURI" & keyof Env]: Env[k] }
) => F.derive(fc<Env>())(_).arb;
