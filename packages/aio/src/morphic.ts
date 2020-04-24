import {
  AsOpaque,
  AsUOpaque,
  M,
  Summoner,
  UM,
  summonFor
} from "@morphic-ts/batteries/lib/summoner-ESBST";

import { EqURI, eqConfig } from "@morphic-ts/eq-interpreters/lib/config";
import { IoTsURI, iotsConfig } from "@morphic-ts/io-ts-interpreters/lib/config";
import { FastCheckURI, fastCheckConfig } from "@morphic-ts/fastcheck-interpreters/lib/config";
import { modelFastCheckInterpreter as fc } from "@morphic-ts/fastcheck-interpreters/lib/interpreters";
import { ShowURI, showConfig } from "@morphic-ts/show-interpreters/lib/config";

export {
  AsOpaque,
  AsUOpaque,
  M,
  Summoner,
  UM,
  summonFor,
  EqURI,
  eqConfig,
  IoTsURI,
  iotsConfig,
  FastCheckURI,
  fastCheckConfig,
  ShowURI,
  showConfig
};

export const arb = <Env, E, A>(F: M<Env, E, A>) => (
  _: { [k in "FastCheckURI" & keyof Env]: Env[k] }
) => F.derive(fc<Env>())(_).arb;
