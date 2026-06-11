import { Link } from 'react-router-dom';

const sections = [
  {
    title: 'What LFG is',
    body: 'LFG is a platform for organizing and joining group runs. We provide the tools to create workouts, form clubs, and connect with other runners. We are not responsible for what happens at events organized through the platform.',
  },
  {
    title: 'Your account',
    body: 'You\'re responsible for your account and everything done through it. Use accurate information when signing up. Don\'t share your credentials or let others use your account.',
  },
  {
    title: 'Acceptable use',
    body: 'Use LFG for its intended purpose — organizing and joining runs. Don\'t use it to harass, spam, or deceive other users. Our Code of Conduct applies to all interactions on the platform and at events organized through it.',
  },
  {
    title: 'Content you create',
    body: 'You own the content you post (workout descriptions, profile info, etc.). By posting it on LFG, you give us permission to display it to other users as part of the service. We won\'t use your content for anything else.',
  },
  {
    title: 'Safety',
    body: 'Running involves physical risk. You participate in workouts at your own risk. LFG is not liable for injuries, accidents, or incidents that occur during runs organized through the platform. Use your judgment about conditions, routes, and your own fitness level.',
  },
  {
    title: 'Account termination',
    body: 'You can delete your account at any time. We may suspend or remove accounts that violate the Code of Conduct or these terms, with or without notice depending on severity.',
  },
  {
    title: 'Changes',
    body: 'We may update these terms as LFG evolves. We\'ll notify users of significant changes. Continued use of LFG after changes means you accept the updated terms.',
  },
];

export default function Terms() {
  return (
    <div className="min-h-screen bg-surface py-12">
      <div className="max-w-2xl mx-auto px-6">
        <Link to="/" className="font-mono text-[14px] font-medium uppercase tracking-[0.1em]">LFG</Link>

        <h1 className="font-sans text-[28px] font-normal tracking-[-0.01em] mt-8 mb-3">
          Terms of Service
        </h1>
        <p className="text-[14px] font-light text-fg-secondary leading-relaxed mb-10">
          By using LFG you agree to these terms. They're short and written in plain language.
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
            Last updated: June 2026. Questions? Reach out at hello@lfgrun.app.
          </p>
        </div>
      </div>
    </div>
  );
}
