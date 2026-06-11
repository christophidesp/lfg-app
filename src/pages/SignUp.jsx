import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

export default function SignUp() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirmationSent, setConfirmationSent] = useState(false);
  const [conductAccepted, setConductAccepted] = useState(false);
  const { signUp, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = location.state?.from;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setError('');
    setLoading(true);

    const { data, error } = await signUp(email, password, { full_name: fullName });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      // Set code of conduct acceptance timestamp
      if (data?.user?.id) {
        await supabase
          .from('profiles')
          .update({ code_of_conduct_accepted_at: new Date().toISOString() })
          .eq('id', data.user.id);
      }
      setLoading(false);
      setConfirmationSent(true);
    }
  };

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="mb-8">
          <Link to="/" className="font-mono text-[14px] font-medium uppercase tracking-[0.1em]">LFG</Link>
          <h1 className="font-sans text-[26px] font-normal tracking-[-0.01em] mt-6">Create your account</h1>
          <p className="font-sans text-[13px] text-fg-secondary mt-2">
            Already have an account?{' '}
            <Link to="/signin" state={redirectTo ? { from: redirectTo } : undefined} className="text-fg underline">Sign in</Link>
          </p>
        </div>

        {confirmationSent && (
          <div className="border border-accent bg-surface p-5 mb-6">
            <p className="text-[14px] font-medium mb-1">Check your email</p>
            <p className="text-[13px] text-fg-secondary font-light leading-relaxed mb-3">
              We sent a confirmation link to <span className="text-fg font-medium">{email}</span>. Please confirm your email before signing in.
            </p>
            <Link to="/signin" state={redirectTo ? { from: redirectTo } : undefined} className="font-mono text-[12px] uppercase tracking-[0.06em] text-accent hover:underline">
              Go to sign in →
            </Link>
          </div>
        )}

        <div className={`border border-border bg-surface p-6 ${confirmationSent ? 'opacity-50 pointer-events-none' : ''}`}>
          <button
            type="button"
            onClick={signInWithGoogle}
            className="w-full flex items-center justify-center gap-3 border border-border px-4 py-2.5 hover:bg-hover transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
              <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
              <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
            </svg>
            <span className="font-sans text-[13px]">Continue with Google</span>
          </button>

          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 border-t border-border"></div>
            <span className="font-mono text-[11px] text-fg-secondary uppercase tracking-[0.06em]">or</span>
            <div className="flex-1 border-t border-border"></div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className={`border border-border border-t-0 bg-surface p-6 ${confirmationSent ? 'opacity-50 pointer-events-none' : ''}`}>
          {error && (
            <div className="border border-[#EF4444] text-[#EF4444] font-mono text-[12px] px-4 py-3 mb-6">
              {error}
            </div>
          )}

          <div className="space-y-5">
            <div>
              <label htmlFor="fullName" className="form-label">Full Name</label>
              <input
                id="fullName"
                name="fullName"
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="input-field"
                placeholder="Jane Doe"
              />
            </div>

            <div>
              <label htmlFor="email" className="form-label">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="form-label">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field"
                placeholder="••••••••"
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="form-label">Confirm Password</label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input-field"
                placeholder="••••••••"
              />
            </div>
          </div>

          <label className="flex items-start gap-3 mt-6 cursor-pointer">
            <input
              type="checkbox"
              checked={conductAccepted}
              onChange={(e) => setConductAccepted(e.target.checked)}
              className="w-4 h-4 accent-accent mt-0.5 flex-shrink-0"
            />
            <span className="text-[13px] text-fg-secondary font-light leading-snug">
              I've read and agree to the{' '}
              <a
                href="/code-of-conduct"
                target="_blank"
                rel="noopener noreferrer"
                className="text-fg underline"
              >
                Code of Conduct
              </a>
            </span>
          </label>

          <button
            type="submit"
            disabled={loading || !conductAccepted}
            className="w-full btn-primary mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating account...' : 'Sign up'}
          </button>
        </form>
      </div>
    </div>
  );
}
