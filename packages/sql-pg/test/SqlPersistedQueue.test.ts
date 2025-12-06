import * as SqlPersistedQueueTest from "../../sql/test/SqlPersistedQueueTest.js"
import { PgContainer } from "./utils.js"

SqlPersistedQueueTest.suite(PgContainer.ClientLive)
