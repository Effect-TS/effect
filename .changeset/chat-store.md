---
"effect": patch
---

Persist chats through an appendable `ChatStore`.

`Chat.Persisted` stored a conversation as a single value and rewrote all of it on every save, so persisting a chat was quadratic in the number of turns and a chat could only ever be loaded whole. It is now backed by `Chat.ChatStore`, which writes only the messages a turn added, reads ranges, and lists the chats in a store.

`Chat.layerPersisted` now requires `ChatStore` rather than `BackingPersistence`. `Chat.layerStoreMemory` is the in-memory implementation, and `Chat.layerStoreBacking` provides a `ChatStore` from an existing `BackingPersistence` for applications that want their current backend.

Saving a chat also no longer mutates the messages it stamps with a message identifier: history is rebuilt with replacement messages instead, so a message already handed to a caller does not change underneath them.
