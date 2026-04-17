/**
 * Renders a gender breakdown string (e.g. "3W / 2M / 1NB") with per-segment
 * native title-attribute tooltips and an optional undisclosed count.
 *
 * Accepts the shape returned by getGenderBreakdown(): { women, men, nonBinary,
 * undisclosed, label }. Returns null if there's nothing to show.
 */
export default function GenderBreakdown({ breakdown }) {
  if (!breakdown || !breakdown.label) return null;
  const { women, men, nonBinary } = breakdown;

  const segments = [];
  if (women > 0) {
    segments.push({
      key: 'w',
      text: `${women}W`,
      tooltip: `${women} ${women === 1 ? 'woman' : 'women'}`,
    });
  }
  if (men > 0) {
    segments.push({
      key: 'm',
      text: `${men}M`,
      tooltip: `${men} ${men === 1 ? 'man' : 'men'}`,
    });
  }
  if (nonBinary > 0) {
    segments.push({
      key: 'nb',
      text: `${nonBinary}NB`,
      tooltip: `${nonBinary} non-binary`,
    });
  }

  return (
    <>
      {segments.map((s, i) => (
        <span key={s.key}>
          {i > 0 && ' / '}
          <span title={s.tooltip} className="cursor-help">{s.text}</span>
        </span>
      ))}
    </>
  );
}
