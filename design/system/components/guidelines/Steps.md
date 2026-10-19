# Steps

A numbered progress row: done steps are ink with a check, the current step is Max Orange, upcoming steps are outlined.

- Provide `steps` (labels) and `current` (zero-based). `onStep` makes them clickable (campaign wizard). `compact` hides all but the current label (phones).
- Keep labels to two words.
- A step given as `{ label, href }` becomes a link, for wizards where each step is its own URL.
