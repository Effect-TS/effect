## Working with SSH

Use the `effect/ssh` modules to connect to SSH servers. Write code against the backend-independent `Ssh` service, then choose a backend: `SshClient` is a dependency-free client built on `Socket` and the `Crypto` service, and `OpenSsh` drives the host's `ssh` executable so the user's OpenSSH configuration applies. `Sftp` exposes the remote file system (also as a `FileSystem`), and `SshChildProcessSpawner` runs `ChildProcess` commands remotely.
