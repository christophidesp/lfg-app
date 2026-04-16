import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

const sections = [
  { title: 'Respect everyone', body: 'No harassment, intimidation, discrimination, or hateful behavior \u2014 whether about gender, race, sexuality, body, ability, or anything else.' },
  { title: 'Running first', body: 'LFG is for running. Unwanted romantic or sexual advances are not welcome. If you meet someone through LFG and want to connect outside of running, ask respectfully, take \u201Cno\u201D as a complete answer, and keep it off the app.' },
  { title: 'Honor identity', body: 'Use the pronouns people have shared. Don\u2019t misgender anyone. Spaces marked for women and non-binary runners exist for a reason \u2014 only join them if they\u2019re meant for you.' },
  { title: 'Show up as promised', body: 'If you\u2019ve committed to a workout, show up or cancel with enough notice. Repeatedly flaking is unfair to hosts and other runners.' },
  { title: 'Keep everyone safe', body: 'Share clear meeting points. Tell the group if you\u2019re dropping off. If you see unsafe or harmful behavior, report it.' },
];

export default function ConductModal({ onAccepted }) {
  const { user } = useAuth();
  const [accepting, setAccepting] = useState(false);

  const handleAccept = async () => {
    setAccepting(true);
    await supabase
      .from('profiles')
      .update({ code_of_conduct_accepted_at: new Date().toISOString() })
      .eq('id', user.id);
    setAccepting(false);
    onAccepted();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0A0A0A]/80 px-4">
      <div className="w-full max-w-lg border border-border bg-surface max-h-[85vh] flex flex-col">
        <div className="p-5 border-b border-border">
          <h2 className="font-sans text-[20px] font-medium">Code of Conduct</h2>
          <p className="text-[13px] text-fg-secondary font-light mt-1">
            Please review and accept before continuing.
          </p>
        </div>

        <div className="p-5 overflow-y-auto flex-1">
          <p className="text-[13px] font-light text-fg-secondary leading-relaxed mb-5">
            LFG is built for runners who want to train together and build real community. A few principles keep it that way.
          </p>
          {sections.map((section, i) => (
            <div
              key={i}
              className="py-4 border-t border-border"
              style={{ borderTopWidth: '0.5px' }}
            >
              <h3 className="font-sans text-[14px] font-medium mb-1">
                <span className="font-mono text-[12px] text-fg-muted mr-1.5">{i + 1}.</span>
                {section.title}
              </h3>
              <p className="text-[13px] font-light text-fg-secondary leading-[1.65]">
                {section.body}
              </p>
            </div>
          ))}
          <div className="pt-4 border-t border-border" style={{ borderTopWidth: '0.5px' }}>
            <p className="text-[12px] font-light text-fg-muted leading-relaxed">
              Reports are reviewed. Breaking these principles can result in warnings, workout restrictions, or removal from LFG.
            </p>
          </div>
        </div>

        <div className="p-5 border-t border-border">
          <button
            onClick={handleAccept}
            disabled={accepting}
            className="w-full btn-accent disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {accepting ? 'Saving...' : 'I understand and agree'}
          </button>
        </div>
      </div>
    </div>
  );
}
