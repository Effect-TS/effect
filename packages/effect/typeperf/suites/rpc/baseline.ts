// Shared Rpc suite baseline that type-checks the 300-RPC group and the client modules used by the fixtures.
import { Schema } from "effect"
import { AtomRpc } from "effect/reactivity"
import { RpcClient } from "effect/rpc"
import { Rpcs } from "./fixtures/_group-300.ts"

Schema.String
RpcClient.make
AtomRpc.Service
Rpcs
