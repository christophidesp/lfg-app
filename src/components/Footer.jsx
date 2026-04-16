import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="border-t border-border py-6 mt-12">
      <div className="max-w-3xl mx-auto px-6 flex items-center justify-between">
        <span className="font-mono text-[11px] text-fg-muted">LFG</span>
        <Link
          to="/code-of-conduct"
          className="font-mono text-[11px] text-fg-muted hover:text-fg transition-colors"
        >
          Code of Conduct
        </Link>
      </div>
    </footer>
  );
}
