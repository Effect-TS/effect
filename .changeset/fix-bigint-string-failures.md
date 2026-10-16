---
"effect": patch
---

Fix `SchemaTransformation.bigintFromString` and `Snowflake.SnowflakeFromString` to reject invalid bigint strings with a typed schema error instead of a defect.
