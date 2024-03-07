---
"effect": patch
---

add Layer.RuntimeClass, to make incremental adoption easier

You can use a RuntimeClass to build an Effect runner that can use the
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

class NotificationsClass extends Layer.RuntimeClass(() => Notifications.Live) {
  notify(message: string): Promise<void> {
    return this.runPromiseService(Notifications, (_) => _.notify(message));
  }
}

async function main() {
  const notifications = new NotificationsClass();
  await notifications.notify("Hello, world!");
  await notifications.dispose();
}

main();
```
