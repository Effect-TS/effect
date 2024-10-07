import * as MysqlDrizzle from "@effect/sql-drizzle/Mysql"
import * as PgDrizzle from "@effect/sql-drizzle/Pg"
import { Layer } from "effect"
import { MysqlContainer } from "./utils-mysql.js"
import { PgContainer } from "./utils-pg.js"

export const DrizzleMysqlLive = MysqlDrizzle.layer.pipe(Layer.provideMerge(MysqlContainer.ClientLive))
export const DrizzlePgLive = PgDrizzle.layer.pipe(Layer.provideMerge(PgContainer.ClientLive))
