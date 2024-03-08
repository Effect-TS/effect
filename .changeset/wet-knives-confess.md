---
"@effect/platform-node": patch
"@effect/platform-bun": patch
"@effect/platform": patch
---

add websocket support to platform http server

You can use the `Http.request.upgrade*` apis to access the `Socket` for the request.

Here is an example server that handles websockets on the `/ws` path:

```ts
import { NodeHttpServer, NodeRuntime } from "@effect/platform-node";
import * as Http from "@effect/platform/HttpServer";
import { Console, Effect, Layer, Schedule, Stream } from "effect";
import { createServer } from "node:http";

const ServerLive = NodeHttpServer.server.layer(() => createServer(), {
  port: 3000,
});

const HttpLive = Http.router.empty.pipe(
  Http.router.get(
    "/ws",
    Effect.gen(function* (_) {
      yield* _(
        Stream.fromSchedule(Schedule.spaced(1000)),
        Stream.map(JSON.stringify),
        Stream.encodeText,
        Stream.pipeThroughChannel(Http.request.upgradeChannel()),
        Stream.decodeText(),
        Stream.runForEach(Console.log)
      );
      return Http.response.empty();
    })
  ),
  Http.server.serve(Http.middleware.logger),
  Http.server.withLogAddress,
  Layer.provide(ServerLive)
);

NodeRuntime.runMain(Layer.launch(HttpLive));
```
