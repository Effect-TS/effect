---
"effect": minor
---

Prevent `WorkflowEngine.layerMemory` from running duplicate compensations after workflow replays.

- Each compensated step keeps one compensation across replays, identified by the activities, durable deferreds, and child workflows it runs directly. With `layerMemory`, a completed step's compensation is kept until a replay registers it again, so shutting down mid-replay still compensates it.
- `Workflow.withCompensation` and the workflow `withCompensation` method accept an optional `{ name }` that identifies the step exactly. A name may be used by only one step per run.
- Unnamed steps that run the same durable operations log a warning, since replays can only match them by completion order.
