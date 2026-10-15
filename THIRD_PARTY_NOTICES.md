# Third-party notices

## Aevi 家庭斗地主 — card rules

- Source: <https://github.com/AurexloveU/doudizhu>
- File used: `src/doudizhu-rules.js`
- License: MIT — Copyright (c) 2026 AurexloveU

`src/rules.js` in this repository is a port of that file's deck model, hand
classification (`classifyMove`), beat relation (`canBeat`), and the plane /
four-with-two logic. The MIT terms are reproduced in full in upstream's
`LICENSE`; the copyright notice above is retained in compliance with them.

Our adaptations, on top of the ported logic:

- joker ids kept as upstream's `LJ` / `BJ` (renaming the small joker to `SJ`
  would collide with the jack of spades and lose a deck card — pinned by a
  regression test); `JOKER_VALUES`, `SMALL_JOKER`, `BIG_JOKER`, and
  `MAX_SEQUENCE_VALUE` lifted into named constants
- fixed three-seat helpers added: `nextSeat`, `seatOrderFrom`, `rolesFor`,
  `winnerSide`, `SEAT_COUNT`
- bidding labels (`BID_LABELS`) and hand heuristics (`handStrength`,
  `countBombs`, `hasRocket`) added
- public-view shaping (`cardPublicView`, `cardsPublicView`) added so the
  authority can decide exactly which cards leave the host
- sequence minimums made explicit (`MIN_STRAIGHT`, `MIN_PAIR_STRAIGHT`,
  `MIN_PLANE`) instead of magic numbers
- `cardFromId` now rejects non-string and malformed input consistently, and
  cards carry a `joker` flag

Behavioural decisions where the public rules are ambiguous are pinned by tests
in `test/rules.test.mjs` and marked `PINNED` there.
