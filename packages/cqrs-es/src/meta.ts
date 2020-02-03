import { ESMeta, esMetaURI } from "./read";
import { EventMetaHidden, metaURI } from "@matechs/cqrs";
import { Option, isNone, fromNullable, none, some } from "fp-ts/lib/Option";
import { EventStoreAggregateEventMetadata } from "./client";

export function adaptMeta(meta: ESMeta): Option<EventMetaHidden> {
  const event = fromNullable(meta[esMetaURI].raw.event);

  if (isNone(event)) {
    return none;
  }

  const metaS = fromNullable(event.value.metadata?.toString("utf-8"));

  if (isNone(metaS)) {
    return none;
  }

  try {
    const metaE: EventStoreAggregateEventMetadata = JSON.parse(metaS.value);

    return some<EventMetaHidden>({
      [metaURI]: {
        kind: event.value.eventType,
        id: event.value.eventId,
        createdAt: metaE.createdAt,
        aggregate: metaE.aggregate,
        root: metaE.root,
        sequence: BigInt(metaE.sequence)
      }
    });
  } catch {
    return none;
  }
}
