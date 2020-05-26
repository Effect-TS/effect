import { liveMain } from "./program"

import * as T from "@matechs/core/Effect"

T.run(liveMain, (exit) => {
  // the program shall not exit as the reads are polling
  console.error(exit)
})
