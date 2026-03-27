# Quick Setup Guide for LFG

Follow these steps to get your LFG app running:

## Step 1: Install Dependencies
```bash
npm install
```

## Step 2: Set Up Supabase

1. Go to [supabase.com](https://supabase.com) and create a free account
2. Create a new project (choose a name, database password, and region)
3. Wait for the project to be set up (takes ~2 minutes)

## Step 3: Get Your Supabase Credentials

1. In your Supabase project, go to **Settings** > **API**
2. Copy these two values:
   - **Project URL** (under "Project URL")
   - **anon public** key (under "Project API keys")

## Step 4: Create Your Database

1. In Supabase, click on **SQL Editor** in the left sidebar
2. Click **New Query**
3. Open the file `database/schema.sql` from this project
4. Copy ALL the SQL code and paste it into the Supabase SQL Editor
5. Click **Run** (green play button)
6. You should see "Success. No rows returned" - that's perfect!

## Step 5: Configure Environment Variables

1. Copy the `.env.example` file:
   ```bash
   cp .env.example .env
   ```

2. Open `.env` and add your Supabase credentials:
   ```
   VITE_SUPABASE_URL=https://yourproject.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```

## Step 6: Run the App

```bash
npm run dev
```

The app will open at `http://localhost:5173`

## Step 7: Create Your First Account

1. Click "Get Started" on the landing page
2. Fill in your details and sign up
3. You're ready to create your first workout!

## Troubleshooting

### "Missing Supabase environment variables" error
- Make sure your `.env` file exists in the root directory
- Make sure the values in `.env` start with `VITE_` (not just `SUPABASE_`)
- Restart your dev server after creating/editing `.env`

### Can't sign up / sign in
- Check that you ran the database schema SQL in Supabase
- Verify your Supabase credentials are correct in `.env`
- Check the browser console for specific error messages

### Database errors
- Make sure you ran the ENTIRE `schema.sql` file in Supabase
- The SQL creates tables, policies, triggers, and functions - all are needed

## Next Steps

Once your app is running:

1. **Create a workout** - Click "Create Workout" in the nav
2. **Browse workouts** - Click "Browse" to see all available workouts
3. **Join a workout** - Request to join someone else's workout
4. **Manage requests** - If you're a workout creator, approve/reject join requests
5. **Comment** - Add comments to workouts to discuss details

## Deploy to Production

When you're ready to deploy:

**Option 1: Vercel (Recommended)**
1. Push your code to GitHub
2. Import on [vercel.com](https://vercel.com)
3. Add environment variables
4. Deploy!

**Option 2: Netlify**
1. Push your code to GitHub
2. Import on [netlify.com](https://netlify.com)
3. Build command: `npm run build`
4. Publish directory: `dist`
5. Add environment variables
6. Deploy!

## Need Help?

Check the main README.md for more detailed information about the project structure and features.
