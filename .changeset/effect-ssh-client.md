---
"effect": patch
---

Add experimental SSH support under `effect/ssh`. The `Ssh` service is a connection factory: `ssh.connect({ host })` opens a scoped connection that runs remote commands, subsystems, and tunnels. Two backends provide it: `SshClient.layer`, a dependency-free client built on `Socket` and the `Crypto` service (keys, agents, passwords, keyboard-interactive, and forwarding in both directions; `SshClient.make` exposes the full client), and `OpenSsh.layer`, which drives the host's `ssh` executable through `ChildProcessSpawner` so the user's OpenSSH configuration applies. `Sftp` opens SFTP sessions on a connection and can expose them as a `FileSystem`, `SshChildProcessSpawner` runs `ChildProcess` commands over a connection, and the `SshKeys`, `SshKnownHosts`, and `SshAgent` services cover key parsing, `known_hosts` verification, and the agent protocol.
