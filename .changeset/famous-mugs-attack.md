---
"effect": patch
---

add Layer.toRunner, to make incremental adoption easier

You can use a Layer.toRunner to build an Effect runner that can use the
dependencies from the given Layer. For example:

```ts
import type { Effect } from "effect";
import { Console, Context, Layer } from "effect";

class Notifications extends Context.Tag("Notifications")<
  Notifications,
  { readonly notify: (message: string) => Effect.Effect<void> }
>() {
  static Live = Layer.succeed(this, {
    notify: (message) => Console.log(message),
  });
}

async function main() {
  const runner = Layer.toRunner(Notifications.Live);
  await runner.runPromiseService(Notifications, (_) =>
    _.notify("Hello world!")
  );
  await runner.dispose();
}

main();
```
