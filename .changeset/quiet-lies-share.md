---
"effect": major
---

Merged module names with their types. e.g: 
```ts
import { Effect } from "effect"
const eff: Effect<never, never, void>
```

(no more `Effect.Effect` needed!)

several type names were aligned with their module name:

- HaltStrategy: StreamHaltStrategy
- Interval: ScheduleInterval
- Intervals: ScheduleIntervals
- PollingMetric: MetricPolling
- PathPatch: ConfigProviderPathPatch
