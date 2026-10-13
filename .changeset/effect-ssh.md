---
"effect": patch
"@effect/platform-node-shared": patch
"@effect/platform-node": patch
"@effect/platform-bun": patch
---

Add experimental SSH support under `effect/ssh` for remote commands, subsystems, and TCP or Unix socket tunnels. `Ssh` opens scoped, backend-independent connections; `SshCommand` builds commands and pipelines. Custom backends can use `SshConnectionProtocol` for RFC 4254 channel handling or provide their own operations with `Ssh.makeConnection`.

`NodeOpenSsh.layer` and `BunOpenSsh.layer` use the system `ssh` executable and connection multiplexing, honoring OpenSSH configuration, the SSH agent, and `known_hosts`. They require OpenSSH 7.4 or later and do not support Windows.
