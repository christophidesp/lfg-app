import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { supabase } from './lib/supabase';
import { NotificationProvider } from './contexts/NotificationContext';
import Landing from './pages/Landing';
import SignIn from './pages/SignIn';
import SignUp from './pages/SignUp';
import Home from './pages/Home';
import CreateWorkout from './pages/CreateWorkout';
import EditWorkout from './pages/EditWorkout';
import WorkoutDetail from './pages/WorkoutDetail';
import ProfilePage from './pages/ProfilePage';
import EditProfile from './pages/EditProfile';
import Notifications from './pages/Notifications';
import ClubsPage from './pages/ClubsPage';
import CreateClub from './pages/CreateClub';
import ClubDetail from './pages/ClubDetail';
import ClubSettings from './pages/ClubSettings';
import InvitePage from './pages/InvitePage';
import ClubInvitePage from './pages/ClubInvitePage';
import Calendar from './pages/Calendar';
import CodeOfConduct from './pages/CodeOfConduct';
import Navbar from './components/Navbar';
import ConductModal from './components/ConductModal';

// Protected route wrapper
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return user ? children : <Navigate to="/signin" state={{ from: location.pathname }} />;
};

// Public route wrapper (redirects to intended destination or home if authenticated)
const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (user) {
    const redirectTo = location.state?.from || '/home';
    return <Navigate to={redirectTo} replace />;
  }

  return children;
};

function ConductGate({ children }) {
  const { user } = useAuth();
  const [checked, setChecked] = useState(false);
  const [needsAcceptance, setNeedsAcceptance] = useState(false);

  useEffect(() => {
    if (!user) { setChecked(true); return; }
    supabase
      .from('profiles')
      .select('code_of_conduct_accepted_at')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        setNeedsAcceptance(!data?.code_of_conduct_accepted_at);
        setChecked(true);
      });
  }, [user]);

  if (!checked) return null;

  return (
    <>
      {needsAcceptance && user && (
        <ConductModal onAccepted={() => setNeedsAcceptance(false)} />
      )}
      {children}
    </>
  );
}

function AppRoutes() {
  const { user } = useAuth();

  return (
    <>
      {user && <Navbar />}
      <ConductGate>
      <Routes>
        <Route 
          path="/" 
          element={
            <PublicRoute>
              <Landing />
            </PublicRoute>
          } 
        />
        <Route 
          path="/signin" 
          element={
            <PublicRoute>
              <SignIn />
            </PublicRoute>
          } 
        />
        <Route 
          path="/signup" 
          element={
            <PublicRoute>
              <SignUp />
            </PublicRoute>
          } 
        />
        <Route
          path="/home"
          element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          }
        />
        <Route path="/dashboard" element={<Navigate to="/home" replace />} />
        <Route 
          path="/create-workout" 
          element={
            <ProtectedRoute>
              <CreateWorkout />
            </ProtectedRoute>
          } 
        />
        <Route path="/browse" element={<Navigate to="/" replace />} />
        <Route
          path="/workout/:id"
          element={
            <ProtectedRoute>
              <WorkoutDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/workout/:id/edit"
          element={
            <ProtectedRoute>
              <EditWorkout />
            </ProtectedRoute>
          }
        />
        <Route
          path="/calendar"
          element={
            <ProtectedRoute>
              <Calendar />
            </ProtectedRoute>
          }
        />
        <Route
          path="/clubs"
          element={
            <ProtectedRoute>
              <ClubsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/clubs/new"
          element={
            <ProtectedRoute>
              <CreateClub />
            </ProtectedRoute>
          }
        />
        <Route
          path="/clubs/:id"
          element={
            <ProtectedRoute>
              <ClubDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/clubs/:id/settings"
          element={
            <ProtectedRoute>
              <ClubSettings />
            </ProtectedRoute>
          }
        />
        <Route
          path="/invite/:token"
          element={<InvitePage />}
        />
        <Route
          path="/clubs/invite/:token"
          element={<ClubInvitePage />}
        />
        <Route
          path="/notifications"
          element={
            <ProtectedRoute>
              <Notifications />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile/edit"
          element={
            <ProtectedRoute>
              <EditProfile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile/:id"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />
        <Route path="/code-of-conduct" element={<CodeOfConduct />} />
      </Routes>
      </ConductGate>
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <Router>
          <AppRoutes />
        </Router>
      </NotificationProvider>
    </AuthProvider>
  );
}

export default App;
