---
"effect": patch
"@effect/platform-node-shared": patch
"@effect/platform-node": patch
"@effect/platform-bun": patch
---

Add experimental SSH support under `effect/ssh`. The `Ssh` service is a backend-independent connection factory: `ssh.connect({ host })` opens a scoped connection that runs remote commands, starts subsystems, and opens tunnels. Commands are `SshCommand` values, built from template literals or a command and arguments and piped into remote pipelines with `SshCommand.pipeTo`. `SshConnectionProtocol.make` implements the client side of the SSH connection protocol as a `Channel` from the server's messages to messages for the server, together with `open`, which opens SSH channels over it, so backends only pump their transport's messages through it; `Ssh.makeConnection` builds a backend's connection from such operations.

`NodeOpenSsh.layer` (`BunOpenSsh.layer` on Bun) provides `Ssh` by starting the host's `ssh` executable as a connection master and using its control socket, in multiplexing proxy mode, pumped through `SshConnectionProtocol`, so the user's OpenSSH configuration, agent, and `known_hosts` apply.
