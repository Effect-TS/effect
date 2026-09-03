---
"effect": patch
---

Honor services explicitly supplied when registering cluster entities through `registerEntity` or `Entity.toLayer`, while retaining construction-context services as fallbacks. This includes construction-provided loggers and tracers when registration supplies no explicit override. Runner-owned configuration, clock, reaper, and Snowflake generator remain authoritative, and entity resources retain the registration scope's lifetime.
