---
"effect": patch
---

add Layer.toRuntimeWithMemoMap api

Similar to Layer.toRuntime, but allows you to share a Layer.MemoMap between
layer builds.

By sharing the MemoMap, layers are shared between each build - ensuring layers
are only built once between multiple calls to Layer.toRuntimeWithMemoMap.
