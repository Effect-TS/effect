import * as R from "../Router"
import {
  accessConfigM,
  config,
  server,
  Server,
  accessRouteInputM,
  body,
  body_,
  getBody,
  next,
  params,
  params_,
  response,
  response_,
  status,
  query,
  query_
} from "../Server"

import * as T from "@matechs/core/Eff/Effect"
import * as Has from "@matechs/core/Eff/Has"
import * as L from "@matechs/core/Eff/Layer"

export const makeServer = <K>(has: Has.Augumented<Server, K>) => {
  return {
    accessRouteInputM,
    body,
    body_,
    getBody,
    next,
    params,
    params_,
    response,
    response_,
    status,
    query,
    query_,
    has,
    child: R.child(has),
    accessConfigM: accessConfigM(has),
    accessServerM: T.accessServiceM(has),
    route: R.route(has),
    use: R.use(has),
    config: config(has),
    server: L.using_(R.root(has), server(has))
  }
}
