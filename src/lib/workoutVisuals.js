const accent = '#E8C547';

export const workoutVisuals = {
  'Intervals': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 160" fill="none"><rect width="400" height="160" fill="#141414"/><path d="M200 30l18 32h-36l18-32z" stroke="${accent}" stroke-width="2" fill="none"/><path d="M188 62v68M212 62v68" stroke="${accent}" stroke-width="2"/><path d="M180 90h40M180 110h40" stroke="${accent}" stroke-width="1.5" stroke-dasharray="4 4"/><circle cx="200" cy="46" r="3" fill="${accent}"/></svg>`,

  'Tempo Run': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 160" fill="none"><rect width="400" height="160" fill="#141414"/><circle cx="200" cy="80" r="40" stroke="${accent}" stroke-width="2"/><circle cx="200" cy="80" r="32" stroke="${accent}" stroke-width="1" stroke-dasharray="4 3"/><path d="M200 80l20-20" stroke="${accent}" stroke-width="2.5" stroke-linecap="round"/><path d="M200 80l-10 16" stroke="${accent}" stroke-width="1.5" stroke-linecap="round"/><circle cx="200" cy="80" r="3" fill="${accent}"/></svg>`,

  'Easy Run': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 160" fill="none"><rect width="400" height="160" fill="#141414"/><path d="M200 40c-12 0-22 8-26 18-6-2-12 2-14 8s2 12 8 14c0 0 1 0 1 0 2 10 12 18 24 18h14c12 0 22-8 24-18 1 0 1 0 1 0 6-2 10-8 8-14s-8-10-14-8c-4-10-14-18-26-18z" stroke="${accent}" stroke-width="2" fill="none"/><path d="M190 72v12M200 68v20M210 72v12" stroke="${accent}" stroke-width="2" stroke-linecap="round"/><path d="M170 120c10-8 20-12 30-12s20 4 30 12" stroke="${accent}" stroke-width="1.5" stroke-dasharray="4 4"/></svg>`,

  'Long Run': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 160" fill="none"><rect width="400" height="160" fill="#141414"/><path d="M80 120l40-50 30 20 40-60 30 30 40-20 30 40 30-20" stroke="${accent}" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M80 120h240" stroke="${accent}" stroke-width="1" stroke-dasharray="4 4"/><circle cx="260" cy="40" r="6" stroke="${accent}" stroke-width="1.5" fill="none"/></svg>`,

  'Race': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 160" fill="none"><rect width="400" height="160" fill="#141414"/><path d="M160 40h80v50h-80z" stroke="${accent}" stroke-width="2" fill="none"/><path d="M160 40h20v12.5h-20v12.5h20v12.5h-20V90" stroke="${accent}" stroke-width="1.5"/><path d="M180 40h20v12.5h-20v12.5h20v12.5h-20" stroke="${accent}" stroke-width="1.5"/><path d="M200 52.5h20v12.5h-20v12.5h20V90" stroke="${accent}" stroke-width="1.5"/><path d="M220 40h20v12.5h-20v12.5h20v12.5h-20" stroke="${accent}" stroke-width="1.5"/><path d="M170 90v30M230 90v30" stroke="${accent}" stroke-width="2"/><path d="M160 120h80" stroke="${accent}" stroke-width="1.5"/></svg>`,

  'Hill Repeats': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 160" fill="none"><rect width="400" height="160" fill="#141414"/><path d="M100 120l50-70 50 70" stroke="${accent}" stroke-width="2" fill="none" stroke-linejoin="round"/><path d="M180 120l50-50 50 50" stroke="${accent}" stroke-width="2" fill="none" stroke-linejoin="round"/><path d="M260 120l40-30 40 30" stroke="${accent}" stroke-width="2" fill="none" stroke-linejoin="round"/><path d="M130 80l10-6 10 6" stroke="${accent}" stroke-width="1" stroke-dasharray="3 3"/><path d="M215 90l10-6 10 6" stroke="${accent}" stroke-width="1" stroke-dasharray="3 3"/></svg>`,

  'Recovery Run': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 160" fill="none"><rect width="400" height="160" fill="#141414"/><path d="M200 50c-4-12-20-16-28-6s-4 24 12 36l16 12 16-12c16-12 20-26 12-36s-24-6-28 6z" stroke="${accent}" stroke-width="2" fill="none"/><path d="M160 110c8 10 24 16 40 16s32-6 40-16" stroke="${accent}" stroke-width="1.5" stroke-dasharray="4 4"/></svg>`,

  'Fartlek': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 160" fill="none"><rect width="400" height="160" fill="#141414"/><path d="M80 100c20-60 40 20 60-30s40 40 60-10 40 50 60 0 40-40 60 10" stroke="${accent}" stroke-width="2" fill="none" stroke-linecap="round"/><circle cx="140" cy="70" r="3" fill="${accent}"/><circle cx="260" cy="60" r="3" fill="${accent}"/><path d="M80 120h240" stroke="${accent}" stroke-width="1" stroke-dasharray="4 4"/></svg>`,

  'Track Workout': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 160" fill="none"><rect width="400" height="160" fill="#141414"/><ellipse cx="200" cy="80" rx="80" ry="40" stroke="${accent}" stroke-width="2" fill="none"/><ellipse cx="200" cy="80" rx="60" ry="28" stroke="${accent}" stroke-width="1" stroke-dasharray="4 3"/><path d="M200 40v-8M200 120v8" stroke="${accent}" stroke-width="1.5"/><circle cx="148" cy="56" r="4" fill="${accent}"/></svg>`,
};

export function getWorkoutVisual(workoutType) {
  return workoutVisuals[workoutType] || workoutVisuals['Easy Run'];
}
