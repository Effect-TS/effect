import { map_, Sync } from "../Effect"

import { random } from "./random"

export const randomBool: Sync<boolean> = map_(random, (n) => n < 0.5)
