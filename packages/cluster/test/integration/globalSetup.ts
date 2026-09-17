import { MySqlContainer } from "@testcontainers/mysql"
import { PostgreSqlContainer } from "@testcontainers/postgresql"
import type { TestProject } from "vitest/node"

declare module "vitest" {
  export interface ProvidedContext {
    readonly clusterDatabases: { readonly mysql: string; readonly pg: string }
  }
}

export default async function setup(project: TestProject) {
  const pg = await new PostgreSqlContainer("postgres:alpine").start()
  try {
    const mysql = await new MySqlContainer("mysql:lts").withHealthCheck({
      test: [
        "CMD-SHELL",
        "MYSQL_PWD=\"$MYSQL_ROOT_PASSWORD\" mysqladmin ping --protocol TCP --host 127.0.0.1 --user root --silent"
      ],
      interval: 250,
      timeout: 1000,
      retries: 1000
    }).start()
    project.provide("clusterDatabases", { mysql: mysql.getConnectionUri(), pg: pg.getConnectionUri() })
    return async () => {
      await Promise.all([pg.stop(), mysql.stop()])
    }
  } catch (error) {
    await pg.stop()
    throw error
  }
}
