import {
  summonFor,
  AsOpaque,
  AsUOpaque
} from "@morphic-ts/batteries/lib/summoner-ESBST"
import { FastCheckURI } from "@morphic-ts/fastcheck-interpreters/lib/hkt"

export interface Config {
  [FastCheckURI]: {
    foo: string
  }
}

export const { define, summon, tagged } = summonFor<Config>({})
export { AsOpaque, AsUOpaque }
