import { getWorkoutVisual } from '../lib/workoutVisuals';

export default function WorkoutCover({ imageUrl, workoutType, height = 'h-[160px]' }) {
  if (imageUrl) {
    return (
      <div className="h-[360px] w-full overflow-hidden border-b border-border">
        <img
          src={imageUrl}
          alt={workoutType}
          className="w-full h-full object-contain"
        />
      </div>
    );
  }

  const svg = getWorkoutVisual(workoutType);
  return (
    <div
      className={`${height} w-full border-b border-border`}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
