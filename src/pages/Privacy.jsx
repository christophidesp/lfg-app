import { Link } from 'react-router-dom';

const sections = [
  {
    title: 'What we collect',
    body: 'When you create an account, we collect your name, email address, and profile information you choose to provide. When you use LFG, we collect information about workouts you create or join, your club memberships, and your location when you choose to share it.',
  },
  {
    title: 'How we use it',
    body: 'We use your information to operate LFG — showing you nearby workouts, connecting you with running groups, and sending you notifications about workouts you\'ve joined. We don\'t sell your data to third parties.',
  },
  {
    title: 'Authentication',
    body: 'We use Supabase for authentication and Google Sign-In as an optional login method. When you sign in with Google, we receive your name, email, and profile picture from your Google account. We don\'t access any other Google data.',
  },
  {
    title: 'Location data',
    body: 'Workout locations are shared with other users so they can find and join runs near them. Your precise real-time location is never tracked or stored — only the meeting point you set for a workout.',
  },
  {
    title: 'Data storage',
    body: 'Your data is stored securely on Supabase infrastructure in the EU (Stockholm). We use industry-standard security practices to protect your information.',
  },
  {
    title: 'Your rights',
    body: 'You can edit or delete your profile at any time. If you want your account and all associated data permanently deleted, contact us and we\'ll process it within 30 days.',
  },
  {
    title: 'Contact',
    body: 'For any privacy-related questions, reach out to us at privacy@lfgrun.app.',
  },
];

export default function Privacy() {
  return (
    <div className="min-h-screen bg-surface py-12">
      <div className="max-w-2xl mx-auto px-6">
        <Link to="/" className="font-mono text-[14px] font-medium uppercase tracking-[0.1em]">LFG</Link>

        <h1 className="font-sans text-[28px] font-normal tracking-[-0.01em] mt-8 mb-3">
          Privacy Policy
        </h1>
        <p className="text-[14px] font-light text-fg-secondary leading-relaxed mb-10">
          LFG is built for runners. We collect only what we need to make the app work, and we're straightforward about what that means.
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
            Last updated: June 2026. We'll notify users of any significant changes to this policy.
          </p>
        </div>
      </div>
    </div>
  );
}
