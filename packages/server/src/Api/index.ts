import * as R from "../Router"
import {
  accessConfigM,
  config,
  getRequestState,
  requestState,
  server as is,
  Server,
  setRequestState
} from "../Server"

import * as T from "@matechs/core/next/Effect"
import * as L from "@matechs/core/next/Layer"

export const HasServer = T.has<Server>()

export const getServerConfig = accessConfigM(HasServer)(T.succeedNow)
export const getServer = T.accessServiceM(HasServer)(T.succeedNow)
export const hasConfig = config(HasServer)
export const server = L.using_(R.root(HasServer), is(HasServer))

export const makeState = <V>(initial: V) => {
  const v = requestState(initial)
  return {
    get: getRequestState(v),
    set: setRequestState(v)
  }
}
