## Working with SSH

Use the `effect/ssh` modules to connect to SSH servers. The `Ssh` service is a connection factory: provide a backend layer once, then open scoped connections with `ssh.connect({ host })` wherever and whenever your program needs them. `SshClient.layer` is a dependency-free client built on `Socket` and the `Crypto` service, and `OpenSsh.layer` drives the host's `ssh` executable so the user's OpenSSH configuration applies. `Sftp` exposes a connection's remote file system (also as a `FileSystem`), and `SshChildProcessSpawner` runs `ChildProcess` commands remotely.
