import * as SqlPersistedQueueTest from "../../sql/test/SqlPersistedQueueTest.js"
import { MysqlContainer } from "./utils.js"

SqlPersistedQueueTest.suite(MysqlContainer.ClientLive)
