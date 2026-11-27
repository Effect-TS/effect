---
"@effect/platform-node-shared": patch
---

`layerProxyProcess` no longer stops a healthy proxy process when the application's event loop is blocked past `responseTimeout` while the proxy process's reply is waiting to be read.
