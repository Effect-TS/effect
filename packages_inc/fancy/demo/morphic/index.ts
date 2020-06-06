import * as M from "@matechs/morphic"
import { AsOpaque, AsUOpaque } from "@matechs/morphic"

export interface Config {
  [M.FastCheckURI]: {
    foo: string
  }
}

export const { define, summon, tagged } = M.summonFor<Config>({})
export { AsOpaque, AsUOpaque }
