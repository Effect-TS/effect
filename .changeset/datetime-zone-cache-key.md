---
"effect": patch
---

Cache named time zones by the requested id as well as the Intl-resolved id, avoiding repeated formatter construction for aliases. Zones still report the Intl-resolved id.
