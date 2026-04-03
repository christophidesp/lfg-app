import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function SignUp() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirmationSent, setConfirmationSent] = useState(false);
  const { signUp } = useAuth();
  const navigate = useNavigate();

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

    const { error } = await signUp(email, password, { full_name: fullName });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
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
            <Link to="/signin" className="text-fg underline">Sign in</Link>
          </p>
        </div>

        {confirmationSent && (
          <div className="border border-accent bg-surface p-5 mb-6">
            <p className="text-[14px] font-medium mb-1">Check your email</p>
            <p className="text-[13px] text-fg-secondary font-light leading-relaxed mb-3">
              We sent a confirmation link to <span className="text-fg font-medium">{email}</span>. Please confirm your email before signing in.
            </p>
            <Link to="/signin" className="font-mono text-[12px] uppercase tracking-[0.06em] text-accent hover:underline">
              Go to sign in →
            </Link>
          </div>
        )}

        <form onSubmit={handleSubmit} className={`border border-border bg-surface p-6 ${confirmationSent ? 'opacity-50 pointer-events-none' : ''}`}>
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

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-primary mt-6 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating account...' : 'Sign up'}
          </button>
        </form>
      </div>
    </div>
  );
}
