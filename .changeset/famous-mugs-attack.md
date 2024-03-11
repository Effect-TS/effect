---
"effect": patch
---

add ManagedRuntime module, to make incremental adoption easier

You can use a ManagedRuntime to run Effect's that can use the
dependencies from the given Layer. For example:

```ts
import { Console, Effect, Layer, ManagedRuntime } from "effect";

class Notifications extends Effect.Tag("Notifications")<
  Notifications,
  { readonly notify: (message: string) => Effect.Effect<void> }
>() {
  static Live = Layer.succeed(this, {
    notify: (message) => Console.log(message),
  });
}

async function main() {
  const runtime = ManagedRuntime.make(Notifications.Live);
  await runtime.runPromise(Notifications.notify("Hello, world!"));
  await runtime.dispose();
}

main();
```
