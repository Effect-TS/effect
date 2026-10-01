---
"effect": patch
---

Keep shards acquired while a shard lock refresh is in flight. Previously, a refresh that started before an acquisition completed reported the newly acquired shards as lost and released them.
