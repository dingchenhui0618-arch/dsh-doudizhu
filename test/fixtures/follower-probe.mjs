/**
 * Out-of-process probe used by test/net.test.mjs.
 *
 * It joins one authority as a follower in its own OS process and prints what it
 * can see. argv: <baseUrl> <code> <name>
 */

import { createFollowerLink } from '../../src/net.js'

const [baseUrl, code, name] = process.argv.slice(2)

const link = createFollowerLink({ baseUrl, code, name, pollTimeoutMs: 2000 })
const joined = await link.join()
await link.refresh()
const snapshot = link.snapshot()

process.stdout.write(
  JSON.stringify({
    seat: joined.seat,
    rejoin: Boolean(joined.rejoin),
    tokenLength: String(joined.token ?? '').length,
    protocol: snapshot.protocol,
    phase: snapshot.phase,
    handLength: snapshot.you.hand.length,
    myHand: snapshot.you.hand,
    otherHands: snapshot.seats.filter((seat) => seat.seat !== joined.seat).map((seat) => seat.hand),
    otherCounts: snapshot.seats.filter((seat) => seat.seat !== joined.seat).map((seat) => seat.count),
    seatsTaken: snapshot.seatsTaken,
  }),
)
