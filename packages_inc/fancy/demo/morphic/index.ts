import { summonFor } from "@morphic-ts/batteries/lib/summoner-ESBST";
import { FastCheckURI } from "@morphic-ts/fastcheck-interpreters/lib/hkt";

export interface Config {
  [FastCheckURI]: {
    foo: string;
  };
}

export const { tagged, define, summon } = summonFor<Config>({});
