import { Router } from "./Router"
import { Server, ServerConfig } from "./Server"

import { Has } from "@matechs/core/next/Has"

export {
  BodyDecoding,
  FinalHandler,
  Handler,
  HandlerR,
  HandlerRE,
  HttpError,
  JsonDecoding,
  ParametersDecoding,
  RequestError,
  Server,
  ServerConfig,
  defaultErrorHandler,
  body,
  config,
  getBodyBuffer,
  query,
  response,
  status,
  HasRequestContext,
  getRequestContext,
  serverConfig
} from "./Server"

export {
  params,
  getRouteInput,
  HasRouter,
  RouteInput,
  HttpMethod,
  RouteHandler,
  RouteHandlerE,
  HasRouteInput,
  Router,
  root,
  Middleware,
  middleware,
  child,
  route,
  use
} from "./Router"

export {
  makeState,
  HasServer,
  getServer,
  getServerConfig,
  hasConfig,
  server
} from "./Api"

export type ServerEnv = Has<Router> & Has<Server> & Has<ServerConfig>
