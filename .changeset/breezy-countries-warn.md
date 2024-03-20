---
"effect": minor
---

add preregisteredWords options to frequency metric key type

You can use this to register a list of words to pre-populate the value of the
metric.

```ts
import { Metric } from "effect";

const counts = Metric.frequency("counts", {
  preregisteredWords: ["a", "b", "c"],
}).register();
```
