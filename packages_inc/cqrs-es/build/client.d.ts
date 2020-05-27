import client from "node-eventstore-client"
import * as T from "@matechs/core/Effect"
import * as M from "@matechs/core/Managed"
import { EventMetaHidden } from "@matechs/cqrs"
export declare const eventStoreURI = "@matechs/cqrs-es/eventStoreURI"
export interface EventStoreConfig {
  [eventStoreURI]: {
    settings: client.ConnectionSettings
    endPointOrGossipSeed: string | client.TcpEndPoint | client.GossipSeed[]
    connectionName?: string | undefined
  }
}
export declare const accessConfig: T.SyncR<
  EventStoreConfig,
  {
    settings: client.ConnectionSettings
    endPointOrGossipSeed: string | client.TcpEndPoint | client.GossipSeed[]
    connectionName?: string | undefined
  }
>
export declare const eventStoreTcpConnection: M.Managed<
  unknown,
  EventStoreConfig,
  EventStoreError,
  client.EventStoreNodeConnection
>
export declare const sendEventToEventStore: (
  event: EventStoreEvent
) => (
  connection: client.EventStoreNodeConnection
) => T.AsyncE<EventStoreError, client.WriteResult>
export interface EventStoreEvent {
  streamId: string
  eventId: string
  expectedStreamVersion: bigint
  eventType: string
  eventMetadata: {}
  data: {}
}
export interface EventStoreAggregateEventMetadata {
  createdAt: string
  aggregate: string
  root: string
  sequence: string
}
export interface EventStoreError {
  type: "EventStoreError"
  message: string
}
export declare const adaptEvent: <T>(event: T & EventMetaHidden) => EventStoreEvent
export declare const sendEvent: (
  connection: client.EventStoreNodeConnection
) => <T>(
  event: T & EventMetaHidden
) => T.Effect<unknown, unknown, EventStoreError, void>
