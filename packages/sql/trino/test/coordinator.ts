import {
  type ExecResult,
  GenericContainer,
  getContainerRuntimeClient,
  type StartedTestContainer,
  Wait
} from "testcontainers"

// Plain promises and no driver imports: globalSetup loads this module outside the test workers.

/** `trinodb/trino:484`, pinned by digest. */
export const TRINO_IMAGE = "trinodb/trino@sha256:2704eb53935af5e582d63d6033e9bf99d20c325e9b0e30b1016ef59a4773979f"

/** What the suites need from a coordinator: a started container, or the shared one reached by container id. */
export interface TrinoServer {
  readonly getHost: () => string
  readonly getMappedPort: (port: number) => number
  readonly exec: (command: Array<string>) => Promise<ExecResult>
}

/** Files written into `/etc/trino` before start; `config` lines are appended to the image's `config.properties`. */
export interface TrinoFiles {
  readonly config?: string | undefined
  readonly files?: Readonly<Record<string, string>> | undefined
}

/** The default access control refuses `SET SESSION AUTHORIZATION`, which the session suites use. */
export const sharedFiles: TrinoFiles = {
  files: { "access-control.properties": "access-control.name=allow-all\n" }
}

/** Succeeds inside a Trino container once `/v1/info` reports `starting: false` (the images lack grep). */
export const serverStartedProbe =
  `case "$(curl -s http://localhost:8080/v1/info)" in *'"starting":false'*) true ;; *) false ;; esac`

// Started is not ready: a fresh coordinator can fail its first queries with NO_NODES_AVAILABLE. Ready means a
// query that schedules splits runs.
const coordinatorReadyProbe = `${serverStartedProbe} && trino --execute 'SELECT count(*) FROM tpch.tiny.nation'`

/**
 * A coordinator that is also its only worker, ready once it runs queries. Readiness is probed inside the
 * container: testcontainers' HTTP wait fails the start under Bun.
 */
export const trinoContainer = (options: TrinoFiles = {}): GenericContainer =>
  new GenericContainer(TRINO_IMAGE)
    .withExposedPorts(8080)
    // An explicit -Xmx keeps the heap inside the limit on hosts where the JVM ignores the cgroup.
    .withResourcesQuota({ memory: 2 })
    .withCopyContentToContainer([
      ...Object.entries(options.files ?? {}).map(([name, content]) => ({ content, target: `/etc/trino/${name}` })),
      { content: options.config ?? "", target: "/tmp/extra-config.properties" },
      { content: "-Xmx1536M\n", target: "/tmp/extra-jvm.config" }
    ])
    .withCommand([
      "sh",
      "-c",
      "cat /tmp/extra-config.properties >> /etc/trino/config.properties && cat /tmp/extra-jvm.config >> /etc/trino/jvm.config && exec /usr/lib/trino/bin/launcher run --etc-dir /etc/trino"
    ])
    .withWaitStrategy(Wait.forSuccessfulCommand(coordinatorReadyProbe).withStartupTimeout(180_000))

/** How a test worker finds the coordinator globalSetup started. */
export interface SharedCoordinator {
  readonly host: string
  readonly port: number
  readonly containerId: string
}

declare module "vitest" {
  export interface ProvidedContext {
    // Absent when a file runs outside the repo's vitest config (no globalSetup).
    readonly trinoCoordinator?: SharedCoordinator
  }
}

export const describeShared = (container: StartedTestContainer): SharedCoordinator => ({
  host: container.getHost(),
  port: container.getMappedPort(8080),
  containerId: container.getId()
})

export const reachShared = (shared: SharedCoordinator): TrinoServer => ({
  getHost: () => shared.host,
  getMappedPort: () => shared.port,
  exec: async (command) => {
    const client = await getContainerRuntimeClient()
    return client.container.exec(client.container.getById(shared.containerId), command)
  }
})
