import * as M from "@matechs/morphic"

export interface Config {
  [M.FastCheckURI]: {
    foo: string
  }
}

export const { make, makeADT } = M.makeFor<Config>({})
