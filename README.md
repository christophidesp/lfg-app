# LFG - Looking For Group

A running workout finder app that helps runners connect with training partners. Built with React and Supabase.

## Features

- 🏃 Create and browse running workouts
- 📍 Location-based matching
- 👥 Request to join workouts with approval system
- 💬 Comment on workouts
- 🔐 User authentication and profiles
- 📱 Responsive design (mobile-friendly)

## Tech Stack

- **Frontend**: React + Vite
- **Styling**: Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth)
- **Routing**: React Router
- **Icons**: Lucide React
- **Date Utilities**: date-fns

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- A Supabase account (free tier available at [supabase.com](https://supabase.com))

### 1. Clone and Install

```bash
npm install
```

### 2. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to your project settings and copy:
   - Project URL
   - Anon/Public API Key

### 3. Create Database Tables

Run the SQL in `database/schema.sql` in your Supabase SQL Editor:

1. Go to your Supabase project
2. Click on "SQL Editor" in the sidebar
3. Click "New Query"
4. Copy and paste the contents of `database/schema.sql`
5. Click "Run"

### 4. Configure Environment Variables

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Edit `.env` and add your Supabase credentials:

```
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 5. Run the Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

## Project Structure

```
src/
├── components/         # Reusable components
│   └── Navbar.jsx     # Navigation bar
├── contexts/          # React contexts
│   └── AuthContext.jsx # Authentication context
├── lib/               # Utilities and config
│   └── supabase.js    # Supabase client
├── pages/             # Page components
│   ├── Landing.jsx
│   ├── SignIn.jsx
│   ├── SignUp.jsx
│   ├── Dashboard.jsx
│   ├── CreateWorkout.jsx
│   ├── BrowseWorkouts.jsx
│   ├── WorkoutDetail.jsx
│   └── Profile.jsx
├── App.jsx            # Main app component with routing
└── main.jsx           # Entry point
```

## Database Schema

The app uses the following main tables:

- `profiles` - User profiles
- `workouts` - Workout posts
- `workout_participants` - Join requests and participants
- `workout_comments` - Comments on workouts

See `database/schema.sql` for the complete schema.

## Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Import your repository on [Vercel](https://vercel.com)
3. Add your environment variables in Vercel settings
4. Deploy!

### Deploy to Netlify

1. Push your code to GitHub
2. Import your repository on [Netlify](https://netlify.com)
3. Add your environment variables in Netlify settings
4. Build command: `npm run build`
5. Publish directory: `dist`

## Future Enhancements

- [ ] Google Maps integration for location search
- [ ] Mobile app (React Native)
- [ ] Push notifications
- [ ] Workout history and stats
- [ ] User ratings and reviews
- [ ] Advanced filtering (pace, distance range, etc.)
- [ ] Group chat for workouts
- [ ] Calendar integration
- [ ] Weather integration

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - feel free to use this project for your own purposes.
