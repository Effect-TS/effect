import * as NodeSocketConnector from "@effect/platform-node-shared/NodeSocketConnector"
import { fromSocketConnector } from "effect/redis/RedisConnection"

export const sockets = NodeSocketConnector.make()
export const makeConnector = () => fromSocketConnector(sockets)
