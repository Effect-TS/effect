import { effect as T, exit as E, freeEnv as F } from "@matechs/effect";
import * as RPC from "../src";
import * as H from "@matechs/http-client";
import * as EX from "@matechs/express";
import * as L from "@matechs/http-client-libcurl";
import { pipe } from "fp-ts/lib/pipeable";
import { Do } from "fp-ts-contrib/lib/Do";
import { placeholderJsonEnv, Todo, placeholderJsonM } from "./shared";
import { Env } from "@matechs/effect/lib/utils/types";

export function authenticated<R, E, A>(
  eff: T.Effect<R, E, A>
): T.Effect<EX.ChildEnv & R, E | string, A> {
  return T.effect.chain(
    EX.accessReqM(req =>
      T.condWith(req.headers["token"] === "check")(T.unit)(
        T.raiseError("bad token")
      )
    ),
    _ => eff
  );
}

// implement the service
export const placeholderJsonLive = F.implement(placeholderJsonM)(
  (_: H.RequestEnv & EX.ChildEnv) => ({
    [placeholderJsonEnv]: {
      getTodo: n =>
        pipe(
          H.get<unknown, Todo>(
            `https://jsonplaceholder.typicode.com/todos/${n}`
          ),
          T.chainError(() => T.raiseError("error fetching todo")),
          T.map(({ body }) => body),
          authenticated
        )
    }
  })
);

// create a new express server
const program = EX.withApp(
  Do(T.effect)
    .do(RPC.server(placeholderJsonM, placeholderJsonLive)) // wire module to express
    .bind("server", EX.bind(8081)) // listen on port 8081
    .return(s => s.server) // return node server
);

// construct live environment
const envLive: Env<typeof program> = {
  ...EX.express,
  ...L.libcurl(),
  ...H.jsonDeserializer,
  [RPC.serverConfigEnv]: {
    [placeholderJsonEnv]: {
      scope: "/placeholderJson" // exposed at /placeholderJson
    }
  }
};

// run express server
T.run(
  T.provideAll(envLive)(program),
  E.fold(
    server => {
      // listen for exit Ctrl+C
      process.on("SIGINT", () => {
        server.close(err => {
          process.exit(err ? 2 : 0);
        });
      });

      // listen for SIGTERM
      process.on("SIGTERM", () => {
        server.close(err => {
          process.exit(err ? 2 : 0);
        });
      });
    },
    e => console.error(e),
    e => console.error(e),
    () => console.error("interrupted")
  )
);
