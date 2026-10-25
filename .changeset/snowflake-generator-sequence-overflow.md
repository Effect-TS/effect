---
"effect": patch
---

Fix `Snowflake.makeGenerator` returning duplicate ids after sequence overflow when the clock is frozen or moves backward.
