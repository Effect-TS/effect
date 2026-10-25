---
"effect": patch
"@effect/platform-node": patch
---

Add `effect/docker`, an Effect-native client for the Docker Engine API, and `NodeDocker` in `@effect/platform-node`.

- `DockerSchema` holds Schemas for the Engine's request and response definitions, generated from moby's API document (API 1.56, decoding every version from 1.44).
- `DockerConfig` is the client's configuration as plain data: `layer` takes static values, and `layerFromEnv` reads it as the Docker CLI does (`DOCKER_HOST`, contexts, TLS material, `config.json`).
- `DockerEngine` is the connection to one Engine: an `HttpClient` that negotiates the API version. It holds no registry credentials.
- `DockerApi` defines the Engine API as `HttpApi` endpoint groups, one per area, which the services are clients of, and the models they take and return where those differ from `DockerSchema`'s, such as secrets as `Redacted`. `ApiVersions` annotates the endpoints and request fields newer than API 1.44 with the version they arrived in. Logs, attach and exec start declare the `Content-Type` that says how their output is framed (`StreamContentType`), attach and exec start on their `101`. A test checks the groups against the operations of the pinned API document, with the places where the Engine differs from it listed. Every endpoint declares the Engine's error responses (`EngineErrors`, or `SwarmErrors` where Swarm serves it, whose 503 is `SwarmUnavailable`), which decode to the `DockerError` reason classes; services fail with them as `DockerError`, which names the operation.
- `DockerSystem` covers ping, version, info, events, disk usage, registry login and build-cache pruning.
- `DockerContainers` covers the container lifecycle, logs, stats, attach and archives; `DockerExec` runs commands in running containers; `DockerNetworks` and `DockerVolumes` manage networks and volumes.
- `DockerRegistryAuth` resolves the registry credentials that images, plugins and services send, as the Docker CLI does (`DOCKER_AUTH_CONFIG`, credential helpers, `auths`); provide it yourself to resolve them another way.
- `DockerImages` pulls, pushes, builds, tags, saves, loads, imports and commits images.
- `DockerSwarm` inits, joins, inspects, updates and leaves a Swarm, and reads the unlock key of an autolocked one. A Swarm endpoint's 503 fails with `SwarmUnavailable`, which isn't retryable, and join tokens and unlock keys are `Redacted`.
- `DockerNodes` lists, inspects, updates and removes a Swarm's nodes.
- `DockerServices` lists, inspects, creates, updates, rolls back and removes services, and streams their logs; `parseLogLine` reads the attributes `details` adds. Specs go as given: registry credentials only with `registryAuth` or `auth`, and `resolveImage` pins the image's digest and platforms as `docker service create` does.
- `DockerTasks` lists and inspects the tasks of services, and streams a task's logs.
- `DockerSecrets` and `DockerSwarmConfigs` list, inspect, create, update and remove secrets and configs. Their `Data` is bytes (`Redacted` for secrets), sent as the padded standard base64 the Engine requires.
- `DockerPlugins` manages plugins: privileges, pull, upgrade, enable, disable, set, create, push and remove, and `install`, which pulls with the privileges an `accept` function grants, configures and enables the plugin, and removes it again when a step fails. Privileges are never accepted on their own.
- Every Swarm object with an `update` (the Swarm, nodes, services, secrets, configs) also has `modify`: it inspects, applies a function to the spec and updates at the version read, starting over while the update is out of sequence.
- Every operation runs in a span named `docker.<Service>.<operation>`, with the resource it acts on as `docker.resource_id` and the negotiated API version; a streaming operation's span lasts until its stream ends. Registry credentials and secret query parameters are redacted.
- `NodeDocker.layer` and `NodeDocker.layerFromEnv` provide them on Node.js, over a unix socket or TCP with TLS.
