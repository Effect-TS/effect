import { MySqlContainer } from "@testcontainers/mysql"
import { PostgreSqlContainer } from "@testcontainers/postgresql"
import type { TestProject } from "vitest/node"

export interface ClusterDatabases {
  readonly mysql: string
  readonly pg: string
}

declare module "vitest" {
  export interface ProvidedContext {
    readonly clusterDatabases: ClusterDatabases
  }
}

export default function setup(project: TestProject) {
  return Promise.all([
    new PostgreSqlContainer("postgres:alpine").start(),
    new MySqlContainer("mysql:lts").start()
  ]).then(([pg, mysql]) => {
    project.provide("clusterDatabases", {
      mysql: mysql.getConnectionUri(),
      pg: pg.getConnectionUri()
    })
    return () => Promise.all([pg.stop(), mysql.stop()]).then(() => undefined)
  })
}
