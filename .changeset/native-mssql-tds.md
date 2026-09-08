---
"@effect/sql-mssql": minor
---

Replace the tedious runtime dependency with an Effect-native TDS 7.4 driver,
including TLS, SQL and NTLMv2 authentication, parameter and result codecs,
stored procedures, table-valued parameters, transaction-aware calls and safe
cancellation. Export native MssqlTypes descriptors and add requestTimeout.

Azure/Entra authentication is not yet supported. Native parameter descriptors
replace tedious descriptors; see the package README for compatibility limits.
