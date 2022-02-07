// ets_tracing: off

import type * as T from "../deps.js"

export class Exited {
  readonly _tag = "Exited"
  constructor(readonly nextKey: number, readonly exit: T.Exit<any, any>) {}
}
