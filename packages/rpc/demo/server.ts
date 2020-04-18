import { T, Service as F, Ex, pipe, U, O } from "@matechs/prelude";
import * as RPC from "../src";
import * as H from "@matechs/http-client";
import * as EX from "@matechs/express";
import * as L from "@matechs/http-client-libcurl";
import { placeholderJsonEnv, Todo, placeholderJsonM } from "./shared";

export function authenticated<S, R, E, A>(
  eff: T.Effect<S, R, E, A>
): T.Effect<S, EX.ChildEnv & R, E | string, A> {
  return T.effect.chain(
    EX.accessReqM((req) =>
      T.condWith(req.headers["token"] === "check")(T.unit)(T.raiseError("bad token"))
    ),
    (_) => eff
  );
}

// implement the service
export const placeholderJsonLive = F.implement(placeholderJsonM)({
  [placeholderJsonEnv]: {
    getTodo: (n) =>
      pipe(
        H.get(`https://jsonplaceholder.typicode.com/todos/${n}`),
        T.chainError(() => T.raiseError("error fetching todo")),
        T.map(({ body }) => body as O.Some<Todo>),
        authenticated
      )
  }
});

// create a new express server
const program = pipe(
  RPC.server(placeholderJsonM, placeholderJsonLive),
  T.chain(() => EX.bind(8081)),
  EX.withApp
);

// construct live environment
const envLive: U.Env<typeof program> = {
  ...EX.express,
  ...L.libcurl(),
  [RPC.serverConfigEnv]: {
    [placeholderJsonEnv]: {
      scope: "/placeholderJson" // exposed at /placeholderJson
    }
  }
};

// run express server
T.run(
  T.provide(envLive)(program),
  Ex.fold(
    (server) => {
      // listen for exit Ctrl+C
      process.on("SIGINT", () => {
        server.close((err) => {
          process.exit(err ? 2 : 0);
        });
      });

      // listen for SIGTERM
      process.on("SIGTERM", () => {
        server.close((err) => {
          process.exit(err ? 2 : 0);
        });
      });
    },
    (e) => console.error(e),
    (e) => console.error(e),
    () => console.error("interrupted")
  )
);
