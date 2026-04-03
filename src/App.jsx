import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
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
import Navbar from './components/Navbar';

// Protected route wrapper
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return user ? children : <Navigate to="/signin" />;
};

// Public route wrapper (redirects to dashboard if authenticated)
const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return !user ? children : <Navigate to="/home" />;
};

function AppRoutes() {
  const { user } = useAuth();

  return (
    <>
      {user && <Navbar />}
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
      </Routes>
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
