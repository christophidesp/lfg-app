import { Link } from 'react-router-dom';

const SIZES = {
  sm: 'w-7 h-7 text-[11px]',
  md: 'w-10 h-10 text-[13px]',
  lg: 'w-16 h-16 text-[18px]',
};

export default function Avatar({ name, avatarUrl, userId, size = 'md', linked = true }) {
  const initial = (name || 'R').charAt(0).toUpperCase();
  const sizeClass = SIZES[size] || SIZES.md;

  const content = avatarUrl ? (
    <img
      src={avatarUrl}
      alt={name || 'Avatar'}
      className={`${sizeClass} object-cover rounded-full`}
    />
  ) : (
    <div className={`${sizeClass} bg-fg text-surface flex items-center justify-center font-mono font-medium rounded-full`}>
      {initial}
    </div>
  );

  if (linked && userId) {
    return (
      <Link to={`/profile/${userId}`} className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
        {content}
      </Link>
    );
  }

  return <div className="flex-shrink-0">{content}</div>;
}
