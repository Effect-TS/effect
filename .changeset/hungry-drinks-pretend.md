---
"effect": minor
---

allowing customizing Stream pubsub strategy

```ts
import { Schedule, Stream } from "effect";

// toPubSub
Stream.fromSchedule(Schedule.spaced(1000)).pipe(
  Stream.toPubSub({
    capacity: 16, // or "unbounded"
    strategy: "dropping", // or "sliding" / "suspend"
  }),
);

// also for the broadcast apis
Stream.fromSchedule(Schedule.spaced(1000)).pipe(
  Stream.broadcastDynamic({
    capacity: 16,
    strategy: "dropping",
  }),
);
```
