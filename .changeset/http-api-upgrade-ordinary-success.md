---
"effect": minor
---

Allow `HttpApiSchema.Upgrade` alongside ordinary success responses, for servers that decline the upgrade, and add `HttpApiClient.isUpgraded` to narrow the client result.

`HttpApiClient.Upgraded` values now carry a `[HttpApiClient.UpgradedTypeId]` brand. Code that builds `Upgraded` values by hand, such as client mocks, must add `[HttpApiClient.UpgradedTypeId]: HttpApiClient.UpgradedTypeId` to the object literal.
