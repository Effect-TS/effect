---
"effect": patch
---

Data: improve DX (displayed types)

Previously, the displayed types of data used the Omit type to exclude certain fields.
This commit removes the use of Omit from the displayed types of data. This makes the types simpler and easier to understand.
It also enforces all fields as readonly.
