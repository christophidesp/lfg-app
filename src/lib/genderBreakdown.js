/**
 * Takes an array of participant/member objects (each with a joined `profiles` object)
 * and returns a gender breakdown summary.
 *
 * Only counts users where:
 *   - gender_identity is set (not null)
 *   - gender_identity is not 'prefer_not_to_say'
 *   - display_gender_on_profile is true
 *
 * Returns: { total, women, men, nonBinary, undisclosed, label }
 * where `label` is a formatted string like "3W / 2M / 1NB" (only includes non-zero groups)
 * and `undisclosed` is the count of users not included in the breakdown.
 *
 * label is null if:
 *   - total < minForDisplay (privacy guard, default 3)
 *   - all participants are undisclosed
 *
 * @param {Array} participants - array of objects with a `profiles` sub-object
 * @param {{ minForDisplay?: number }} options
 */
export function getGenderBreakdown(participants, { minForDisplay = 3 } = {}) {
  if (!participants || participants.length === 0) {
    return { total: 0, women: 0, men: 0, nonBinary: 0, undisclosed: 0, label: null };
  }

  const total = participants.length;
  let women = 0;
  let men = 0;
  let nonBinary = 0;
  let undisclosed = 0;

  for (const p of participants) {
    const profile = p.profiles ?? p;
    const gi = profile?.gender_identity;
    const display = profile?.display_gender_on_profile;

    if (!gi || gi === 'prefer_not_to_say' || display === false) {
      undisclosed++;
    } else if (gi === 'woman') {
      women++;
    } else if (gi === 'man') {
      men++;
    } else if (gi === 'non_binary') {
      nonBinary++;
    } else {
      undisclosed++;
    }
  }

  // Privacy guard: never reveal gender when group is too small
  if (total < minForDisplay) {
    return { total, women, men, nonBinary, undisclosed, label: null };
  }

  // All undisclosed — nothing to show
  if (women === 0 && men === 0 && nonBinary === 0) {
    return { total, women, men, nonBinary, undisclosed, label: null };
  }

  const parts = [];
  if (women > 0) parts.push(`${women}W`);
  if (men > 0) parts.push(`${men}M`);
  if (nonBinary > 0) parts.push(`${nonBinary}NB`);

  return { total, women, men, nonBinary, undisclosed, label: parts.join(' / ') };
}

/**
 * Returns a percentage-based hosting breakdown string for club workouts.
 * Each workout should have a `profiles` property (the creator's profile).
 *
 * Only returns a result if workouts.length >= 5.
 * Returns null if no creators have disclosed gender.
 *
 * @param {Array} workouts
 * @returns {string|null} e.g. "45% W / 50% M / 5% NB"
 */
export function getHostingBreakdown(workouts) {
  if (!workouts || workouts.length < 5) return null;

  let women = 0;
  let men = 0;
  let nonBinary = 0;

  for (const w of workouts) {
    const profile = w.profiles;
    const gi = profile?.gender_identity;
    const display = profile?.display_gender_on_profile;

    if (!gi || gi === 'prefer_not_to_say' || display === false) continue;
    if (gi === 'woman') women++;
    else if (gi === 'man') men++;
    else if (gi === 'non_binary') nonBinary++;
  }

  const disclosed = women + men + nonBinary;
  if (disclosed === 0) return null;

  const parts = [];
  if (women > 0) parts.push(`${Math.round((women / disclosed) * 100)}% W`);
  if (men > 0) parts.push(`${Math.round((men / disclosed) * 100)}% M`);
  if (nonBinary > 0) parts.push(`${Math.round((nonBinary / disclosed) * 100)}% NB`);

  return parts.join(' / ');
}
