---
"effect": patch
---

Fix the SQL event journal resending entries the remote has not echoed back on every upload. Upload progress is now checkpointed per remote by insertion order, so entries imported later with older ids are still forwarded, and conflict lookups, entry reads and remote sequence lookups use new indexes. Existing databases are migrated the first time they are opened, which needs a writable connection; entries the remote has not confirmed may be uploaded once more after the upgrade.
