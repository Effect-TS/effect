import { summon, tagged } from "morphic-ts/lib/batteries/summoner-no-union";

export const TodoAdded = summon(F =>
  F.interface(
    {
      type: F.stringLiteral("TodoAdded"),
      id: F.number(),
      todo: F.string()
    },
    "TodoAdded"
  )
);

export const TodoRemoved = summon(F =>
  F.interface(
    {
      type: F.stringLiteral("TodoRemoved"),
      id: F.number()
    },
    "TodoRemoved"
  )
);

// define all events in your domain
export const DomainEvent = tagged("type")({ TodoAdded, TodoRemoved });
