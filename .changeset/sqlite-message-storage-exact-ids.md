---
"effect": patch
---

`SqlMessageStorage` reads SQLite snowflake ids as text, so ids above 2^53 stay exact on drivers that return integers as JavaScript numbers, including Cloudflare Durable Objects.
