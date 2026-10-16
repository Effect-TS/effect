---
"effect": patch
---

Wait for the outermost SQL transaction to commit before notifying `SqlMessageStorage` reply handlers, publishing `SqlEventLogServerUnencrypted` changes and running `Reactivity` invalidations, including when the transaction was opened outside those services. Rolled-back work no longer notifies.
