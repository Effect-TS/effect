---
"@effect/platform": patch
---

add HttpServerRespondable trait

This trait allows you to define how a value should be responded to in an HTTP
server.

You can it for both errors and success values.

```ts
import { Schema } from "@effect/schema";
import {
  HttpRouter,
  HttpServerRespondable,
  HttpServerResponse,
} from "@effect/platform";

class User extends Schema.Class<User>("User")({
  name: Schema.String,
}) {
  [HttpServerRespondable.symbol]() {
    return HttpServerResponse.schemaJson(User)(this);
  }
}

class MyError extends Schema.TaggedError<MyError>()("MyError", {
  message: Schema.String,
}) {
  [HttpServerRespondable.symbol]() {
    return HttpServerResponse.schemaJson(MyError)(this, { status: 403 });
  }
}

HttpRouter.empty.pipe(
  // responds with `{ "name": "test" }`
  HttpRouter.get("/user", Effect.succeed(new User({ name: "test" }))),
  // responds with a 403 status, and `{ "_tag": "MyError", "message": "boom" }`
  HttpRouter.get("/fail", new MyError({ message: "boom" })),
);
```
