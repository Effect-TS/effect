import { EventStoreAggregateEventMetadata } from "./client"
import { ESMeta, esMetaURI } from "./read"

import * as O from "@matechs/core/Option"
import { EventMetaHidden, metaURI } from "@matechs/cqrs"

export function adaptMeta(meta: ESMeta): O.Option<EventMetaHidden> {
  const event = O.fromNullable(meta[esMetaURI].raw.event)

  if (O.isNone(event)) {
    return O.none
  }

  const metaS = O.fromNullable(event.value.metadata?.toString("utf-8"))

  if (O.isNone(metaS)) {
    return O.none
  }

  try {
    const metaE: EventStoreAggregateEventMetadata = JSON.parse(metaS.value)

    return O.some<EventMetaHidden>({
      [metaURI]: {
        kind: event.value.eventType,
        id: event.value.eventId,
        createdAt: metaE.createdAt,
        aggregate: metaE.aggregate,
        root: metaE.root,
        sequence: BigInt(metaE.sequence)
      }
    })
  } catch {
    return O.none
  }
}
