import { Link } from 'react-router-dom';

export default function Landing() {
  return (
    <div className="min-h-screen bg-surface">
      <div className="max-w-5xl mx-auto px-6 pt-32 pb-20">
        <div className="max-w-2xl">
          <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-fg-secondary mb-6">
            Running workout finder
          </p>
          <h1 className="font-sans text-[34px] font-light tracking-[-0.02em] mb-6">
            Never run alone again
          </h1>
          <p className="font-sans text-[15px] font-light leading-relaxed text-fg-secondary mb-10 max-w-lg">
            Find running partners for your workouts, from easy runs to intense intervals.
            Post sessions, join groups, train together.
          </p>
          <div className="flex gap-4">
            <Link
              to="/signup"
              className="btn-accent"
            >
              Get Started
            </Link>
            <Link
              to="/signin"
              className="btn-secondary"
            >
              Sign In
            </Link>
          </div>
        </div>

        <div className="mt-24 border-t border-border-strong pt-6">
          <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-fg-secondary mb-6">
            How it works
          </p>
          <div className="grid md:grid-cols-3 gap-[1px] bg-border-strong border border-border-strong">
            <div className="bg-surface p-8">
              <p className="font-mono text-[11px] font-medium uppercase tracking-[0.1em] text-fg-secondary mb-3">01</p>
              <h3 className="font-sans text-[15px] font-medium mb-2">Post a workout</h3>
              <p className="font-sans text-[13px] text-fg-secondary">
                Set the type, time, location, and pace. Choose how many can join.
              </p>
            </div>
            <div className="bg-surface p-8">
              <p className="font-mono text-[11px] font-medium uppercase tracking-[0.1em] text-fg-secondary mb-3">02</p>
              <h3 className="font-sans text-[15px] font-medium mb-2">Find runners</h3>
              <p className="font-sans text-[13px] text-fg-secondary">
                Browse upcoming sessions. Filter by type and location.
              </p>
            </div>
            <div className="bg-surface p-8">
              <p className="font-mono text-[11px] font-medium uppercase tracking-[0.1em] text-fg-secondary mb-3">03</p>
              <h3 className="font-sans text-[15px] font-medium mb-2">Run together</h3>
              <p className="font-sans text-[13px] text-fg-secondary">
                Request to join, get approved, and show up. Simple as that.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
