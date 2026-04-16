import { Link } from 'react-router-dom';

const sections = [
  {
    title: 'Respect everyone',
    body: 'No harassment, intimidation, discrimination, or hateful behavior \u2014 whether about gender, race, sexuality, body, ability, or anything else.',
  },
  {
    title: 'Running first',
    body: 'LFG is for running. Unwanted romantic or sexual advances are not welcome. If you meet someone through LFG and want to connect outside of running, ask respectfully, take \u201Cno\u201D as a complete answer, and keep it off the app.',
  },
  {
    title: 'Honor identity',
    body: 'Use the pronouns people have shared. Don\u2019t misgender anyone. Spaces marked for women and non-binary runners exist for a reason \u2014 only join them if they\u2019re meant for you.',
  },
  {
    title: 'Show up as promised',
    body: 'If you\u2019ve committed to a workout, show up or cancel with enough notice. Repeatedly flaking is unfair to hosts and other runners.',
  },
  {
    title: 'Keep everyone safe',
    body: 'Share clear meeting points. Tell the group if you\u2019re dropping off. If you see unsafe or harmful behavior, report it.',
  },
];

export default function CodeOfConduct() {
  return (
    <div className="min-h-screen bg-surface py-12">
      <div className="max-w-2xl mx-auto px-6">
        <Link to="/" className="font-mono text-[14px] font-medium uppercase tracking-[0.1em]">LFG</Link>

        <h1 className="font-sans text-[28px] font-normal tracking-[-0.01em] mt-8 mb-3">
          Code of Conduct
        </h1>
        <p className="text-[14px] font-light text-fg-secondary leading-relaxed mb-10">
          LFG is built for runners who want to train together and build real community. A few principles keep it that way.
        </p>

        <div>
          {sections.map((section, i) => (
            <div
              key={i}
              className="py-6 border-t border-border"
              style={{ borderTopWidth: '0.5px' }}
            >
              <h2 className="font-sans text-[17px] font-medium mb-2">
                <span className="font-mono text-[13px] text-fg-muted mr-2">{i + 1}.</span>
                {section.title}
              </h2>
              <p className="text-[14px] font-light text-fg-secondary leading-[1.7]">
                {section.body}
              </p>
            </div>
          ))}
        </div>

        <div className="py-6 border-t border-border" style={{ borderTopWidth: '0.5px' }}>
          <p className="text-[13px] font-light text-fg-secondary leading-relaxed">
            Reports are reviewed. Breaking these principles can result in warnings, workout restrictions, or removal from LFG.
          </p>
        </div>
      </div>
    </div>
  );
}
