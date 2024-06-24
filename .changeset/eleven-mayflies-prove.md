---
"@effect/platform": patch
---

add Layer based api for creating HttpRouter's

```ts
import {
  HttpMiddleware,
  HttpRouter,
  HttpServer,
  HttpServerResponse,
} from "@effect/platform";
import { BunHttpServer, BunRuntime } from "@effect/platform-bun";
import { Effect, Layer } from "effect";

// create your router Context.Tag
class UserRouter extends HttpRouter.Tag("UserRouter")<UserRouter>() {}

// create routes with the `.use` api.
// There is also `.useScoped`
const GetUsers = UserRouter.use((router) =>
  Effect.gen(function* () {
    yield* router.get("/", HttpServerResponse.text("got users"));
  }),
);

const CreateUser = UserRouter.use((router) =>
  Effect.gen(function* () {
    yield* router.post("/", HttpServerResponse.text("created user"));
  }),
);

const AllRoutes = Layer.mergeAll(GetUsers, CreateUser);

const ServerLive = BunHttpServer.layer({ port: 3000 });

// access the router with the `.router` api, to create your server
const HttpLive = Layer.unwrapEffect(
  Effect.gen(function* () {
    return HttpServer.serve(yield* UserRouter.router, HttpMiddleware.logger);
  }),
).pipe(
  Layer.provide(UserRouter.Live),
  Layer.provide(AllRoutes),
  Layer.provide(ServerLive),
);

BunRuntime.runMain(Layer.launch(HttpLive));
```
