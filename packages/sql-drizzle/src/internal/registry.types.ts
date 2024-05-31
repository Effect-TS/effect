import type { DrizzleEntity, Query } from "drizzle-orm"

export type ClassType = { new(...args: Array<any>): any }

export interface DrizzleDialect extends DrizzleEntity {
}

export interface DrizzleQueryBuilderInstance extends DrizzleEntity {
  dialect: DrizzleDialect
  toSQL(): Query
}

export interface DrizzleDatabase extends DrizzleEntity {
  dialect: DrizzleDialect
}
