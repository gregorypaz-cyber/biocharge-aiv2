export const QUERY_KEYS = {
  checkins: (email, limit) =>
    limit == null ? ['checkins', email] : ['checkins', email, limit],
  trainingSessions: (email, limit) =>
    limit == null ? ['training-sessions', email] : ['training-sessions', email, limit],
};