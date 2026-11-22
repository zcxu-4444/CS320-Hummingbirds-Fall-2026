// The food poll resolution logic, kept separate from the route so it can be
// unit tested without a database (see our test plan).

export type PollOptionVotes = { restaurant_id: string; voters: string[] };
export type ResolvedBy = "vote" | "tie_roulette" | "fail_roulette" | "host_override";
export type Resolution = { restaurant_id: string; resolved_by: ResolvedBy };

// Approval voting:
// - fewer than half the members voted (or nobody voted) -> roulette among ALL options
// - one option has the most votes                       -> it wins
// - tie for the most votes                              -> roulette among the tied options
// `random` is passed in so tests can make the roulette predictable.
export function pickWinner(
  options: PollOptionVotes[],
  memberCount: number,
  random: () => number = Math.random,
): Resolution {
  if (options.length === 0) throw new Error("NO_OPTIONS");

  const pick = <T>(list: T[]) => list[Math.floor(random() * list.length)];

  const voters = new Set(options.flatMap((o) => o.voters));
  const topVotes = Math.max(...options.map((o) => o.voters.length));

  if (topVotes === 0 || voters.size * 2 < memberCount) {
    return { restaurant_id: pick(options).restaurant_id, resolved_by: "fail_roulette" };
  }

  const tied = options.filter((o) => o.voters.length === topVotes);
  if (tied.length > 1) {
    return { restaurant_id: pick(tied).restaurant_id, resolved_by: "tie_roulette" };
  }
  return { restaurant_id: tied[0].restaurant_id, resolved_by: "vote" };
}
