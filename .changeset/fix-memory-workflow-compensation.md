---
"effect": patch
---

Prevent `WorkflowEngine.layerMemory` from running duplicate compensations after workflow replays. Each compensated step keeps one compensation across replays, identified by the activities, durable deferreds, and child workflows it runs directly. A completed step's compensation is kept until a replay registers it again, so shutting down mid-replay still compensates it.
