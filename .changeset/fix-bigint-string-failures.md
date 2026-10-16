---
"effect": patch
---

Fix `SchemaGetter.BigInt` to return `SchemaIssue.InvalidValue` for inputs that cannot be converted to a bigint. This also makes `SchemaTransformation.bigintFromString` and `Snowflake.SnowflakeFromString` reject invalid strings with typed schema errors instead of defects.
