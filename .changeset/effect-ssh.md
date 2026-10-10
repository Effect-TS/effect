---
"effect": patch
---

Add experimental SSH support under `effect/ssh`. The `Ssh` service is a backend-independent connection factory: `ssh.connect({ host })` opens a scoped connection that runs remote commands, subsystems, and tunnels. `OpenSsh.layer` provides it by driving the host's `ssh` executable through `ChildProcessSpawner`, so the user's OpenSSH configuration, agent, and `known_hosts` apply, and `Ssh.makeConnection` builds connections for other backends. `SshChildProcessSpawner` runs `ChildProcess` commands over a connection.
