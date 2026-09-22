---
"effect": patch
---

Fix `Metric` series identity and speed up attributed updates.

- A metric id containing `:` no longer shares a series with an id plus a description, and a description no longer shares a series with attributes.
- Unattributed metrics register again after their `MetricRegistry` is cleared, instead of updating a detached series that snapshots no longer show.
- Empty attributes select the unattributed series instead of a second series with identical labels.
- `Metric.withAttributes` metrics, and metrics updated under `CurrentMetricAttributes`, resolve their series key once per contextual attribute set instead of merging, sorting and serializing the attributes on every update.

```ts
import { Metric } from "effect"

// Separate series; previously every update went to one shared series.
Metric.counter("jobs:requests")
Metric.counter("jobs", { description: "requests" })
```
