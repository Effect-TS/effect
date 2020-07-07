import * as R from "../Router"
import {
  accessConfigM,
  body,
  config,
  getBodyBuffer,
  getRequestState,
  getRouteInput,
  next,
  params,
  query,
  requestState,
  response,
  server,
  Server,
  setRequestState,
  status
} from "../Server"

import * as T from "@matechs/core/next/Effect"
import * as Has from "@matechs/core/next/Has"
import * as L from "@matechs/core/next/Layer"

export const makeServer = <K>(has: Has.Augumented<Server, K>) => {
  return {
    getRouteInput,
    body,
    getBodyBuffer,
    next,
    params,
    response,
    status,
    query,
    has,
    child: R.child(has),
    getServerConfig: accessConfigM(has)(T.succeedNow),
    getServer: T.accessServiceM(has)(T.succeedNow),
    route: R.route(has),
    use: R.use(has),
    hasConfig: config(has),
    server: L.using_(R.root(has), server(has)),
    makeState: <V>(initial: V) => {
      const v = requestState(initial)
      return {
        get: getRequestState(v),
        set: setRequestState(v)
      }
    }
  }
}
