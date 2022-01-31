// ets_tracing: off

import * as T from "../deps-core"
import * as R from "./deps-ref"
import { ReleaseMap } from "./ReleaseMap"
import { Running } from "./Running.js"
import type { State } from "./State.js"

export const makeReleaseMap = T.map_(
  R.makeRef<State>(new Running(0, new Map())),
  (s) => new ReleaseMap(s)
)
