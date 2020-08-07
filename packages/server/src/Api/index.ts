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
import * as Has from "@matechs/core/next/Has"
import * as L from "@matechs/core/next/Layer"

export const HasServer = Has.has<Server>()

export const getServerConfig = accessConfigM(HasServer)(T.succeed)
export const getServer = T.accessServiceM(HasServer)(T.succeed)
export const hasConfig = config(HasServer)
export const server = L.using_(R.root(HasServer), is(HasServer))

export const makeState = <V>(initial: V) => {
  const v = requestState(initial)
  return {
    get: getRequestState(v),
    set: setRequestState(v)
  }
}
