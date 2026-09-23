---
"effect": patch
---

Interrupting a `PubSub` subscriber or a backpressured publisher in the moment before it suspends no longer leaves state behind. An interrupted `take`, `takeAll` or `takeBetween` could leave a registration that consumed the next published message without delivering it, and an interrupted `publish` on a full bounded `PubSub` could still publish its message once space appeared.
