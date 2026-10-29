---
"effect": patch
---

Wake a parent workflow when its suspended child is interrupted with `ClusterWorkflowEngine`, and surface the child's interruption to the parent as a defect from `Child.execute` so the parent completes instead of replaying.
