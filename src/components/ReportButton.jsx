import { useState } from 'react';
import { Flag, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { REPORT_REASONS } from '../constants/identity';

export default function ReportButton({ userId, workoutId, clubId }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reason) return;

    setSubmitting(true);
    setError('');

    const { error: insertError } = await supabase.from('reports').insert([
      {
        reporter_id: user.id,
        reported_user_id: userId || null,
        reported_workout_id: workoutId || null,
        reported_club_id: clubId || null,
        reason,
        details: details.trim() || null,
      },
    ]);

    if (insertError) {
      setError('Failed to submit report. Please try again.');
      setSubmitting(false);
      return;
    }

    setSubmitting(false);
    setSubmitted(true);
    setTimeout(() => {
      setOpen(false);
      setSubmitted(false);
      setReason('');
      setDetails('');
    }, 2500);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 font-mono text-[11px] text-fg-muted hover:text-fg transition-colors"
      >
        <Flag size={12} />
        Report
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0A0A0A]/80 px-4">
          <div className="w-full max-w-md border border-border bg-surface">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h2 className="font-sans text-[17px] font-medium">Submit a report</h2>
              <button
                onClick={() => { setOpen(false); setError(''); }}
                className="text-fg-muted hover:text-fg transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {submitted ? (
              <div className="p-5">
                <p className="text-[14px] font-medium mb-1">Report submitted</p>
                <p className="text-[13px] text-fg-secondary font-light">
                  We review every report. Thank you for helping keep LFG safe.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="p-5 space-y-5">
                {error && (
                  <div className="border border-[#EF4444] text-[#EF4444] font-mono text-[12px] px-4 py-3">
                    {error}
                  </div>
                )}

                <div>
                  <label htmlFor="report-reason" className="form-label">Reason</label>
                  <select
                    id="report-reason"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="input-field"
                    required
                  >
                    <option value="">Select a reason</option>
                    {REPORT_REASONS.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="report-details" className="form-label">Details (optional)</label>
                  <textarea
                    id="report-details"
                    value={details}
                    onChange={(e) => setDetails(e.target.value.slice(0, 500))}
                    rows="4"
                    className="input-field"
                    placeholder="Tell us what happened..."
                    maxLength={500}
                  />
                  <p className="font-mono text-[10px] text-fg-muted mt-1 text-right">
                    {details.length}/500
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={submitting || !reason}
                    className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? 'Submitting...' : 'Submit report'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setOpen(false); setError(''); }}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
