---
"effect": patch
---

Make the Pool usage TTL strategy expire excess items only after a full idle timeout since their last release. Keep checked-out and reserved items live, and retire the longest-idle items first to avoid connection churn during regular traffic.
