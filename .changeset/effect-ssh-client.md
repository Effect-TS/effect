---
"effect": patch
---

Add experimental SSH support under `effect/ssh`. The `Ssh` service runs remote commands, subsystems, and tunnels with two backends: `SshClient`, a dependency-free client built on `Socket` and WebCrypto (keys, agents, passwords, keyboard-interactive, and forwarding in both directions), and `OpenSsh`, which drives the host's `ssh` executable through `ChildProcessSpawner` so the user's OpenSSH configuration applies. `Sftp` provides an SFTP client that can also be used as a `FileSystem`, `SshChildProcessSpawner` runs `ChildProcess` commands on the remote host, and `SshKey`, `SshKnownHosts`, and `SshAgent` cover key parsing, `known_hosts` verification, and the agent protocol.
