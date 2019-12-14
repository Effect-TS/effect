import { effect as T, exit as E } from "@matechs/effect";
import * as RPC from "@matechs/rpc";
import * as H from "@matechs/http-client";
import * as EX from "@matechs/express";
import * as L from "@matechs/http-client-libcurl";
import { pipe } from "fp-ts/lib/pipeable";
import { Do } from "fp-ts-contrib/lib/Do";
import { placeholderJsonEnv, PlaceholderJson, Todo } from "./shared";

// implement the service
export const placeholderJsonLive: PlaceholderJson = {
  [placeholderJsonEnv]: {
    getTodo: n =>
      pipe(
        H.get<unknown, Todo>(`https://jsonplaceholder.typicode.com/todos/${n}`),
        T.chainError(() => T.raiseError("error fetching todo")),
        T.map(({ body }) => body)
      )
  }
};

// create a new express server
const program = EX.withApp(
  Do(T.effect)
    .do(RPC.bind(placeholderJsonLive, placeholderJsonEnv)) // wire module to express
    .bind("server", EX.bind(8081)) // listen on port 8081
    .return(s => s.server) // return node server
);

// construct live environment
const envLive = pipe(
  T.noEnv,
  T.mergeEnv(EX.express),
  T.mergeEnv(L.libcurl()),
  T.mergeEnv(H.jsonDeserializer),
  T.mergeEnv(placeholderJsonLive),
  // configure RPC server for module <placeholderJsonLive, placeholderJsonEnv>
  T.mergeEnv(
    RPC.serverConfig(
      placeholderJsonLive,
      placeholderJsonEnv
    )({
      scope: "/placeholderJson" // exposed at /placeholderJson
    })
  )
);

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
