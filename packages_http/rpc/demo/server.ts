import "isomorphic-fetch"

import { inspect } from "util"

import * as RPC from "../src"

import {
  PlaceholderJsonURI,
  Todo,
  PlaceholderJsonService,
  PlaceholderJson
} from "./shared"

import * as T from "@matechs/core/Effect"
import { pipe } from "@matechs/core/Function"
import * as O from "@matechs/core/Option"
import * as F from "@matechs/core/Service"
import * as EX from "@matechs/express"

const todos: Array<Todo> = [
  { id: 1, completed: false, title: "todo 1", userId: 1 },
  { id: 2, completed: false, title: "todo 2", userId: 2 },
  { id: 3, completed: false, title: "todo 3", userId: 3 },
  { id: 4, completed: false, title: "todo 4", userId: 1 },
  { id: 5, completed: false, title: "todo 5", userId: 2 },
  { id: 6, completed: false, title: "todo 6", userId: 3 },
  { id: 7, completed: false, title: "todo 7", userId: 4 }
]

export function authenticated<S, R, E, A>(
  eff: T.Effect<S, R, E, A>
): T.Effect<S, EX.RequestContext & R, E | string, A> {
  return T.chain_(
    EX.accessReqM((req) =>
      T.condWith(req.headers["token"] === "check")(T.unit)(T.raiseError("bad token"))
    ),
    (_) => eff
  )
}

// implement the service
export const PlaceholderJsonLive = F.layer(PlaceholderJsonService)({
  [PlaceholderJsonURI]: {
    getTodo: (n) =>
      pipe(
        T.trySync(() => todos[n]),
        T.chainError(() => T.raiseError("error fetching todo")),
        T.map(O.fromNullable),
        authenticated
      )
  }
})

// create a new express server
const program = pipe(
  T.never,
  RPC.Server(PlaceholderJsonService, PlaceholderJsonLive.use)
    .with(EX.Express(8081))
    .with(RPC.ServerConfig<PlaceholderJson>(PlaceholderJsonURI, "/placeholderJson")).use
)

pipe(
  program,
  T.exitCode(
    T.foldExitCode(
      () => {
        console.log("Process correctly exited.")
      },
      (_) => {
        console.error("Process completed with:")
        console.error(_)
      },
      (_) => {
        console.error("Process errored with:")
        console.error(inspect(_, true, 10))
      }
    )
  )
)
