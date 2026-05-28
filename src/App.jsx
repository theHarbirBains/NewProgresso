import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import ActiveWorkout from './pages/ActiveWorkout';
import History from './pages/History';
import ExerciseLibrary from './pages/ExerciseLibrary';
import WorkoutDetail from './pages/WorkoutDetail';
import ExerciseProgress from './pages/ExerciseProgress';
import NutritionDashboard from './pages/NutritionDashboard';
import FoodLibrary from './pages/FoodLibrary';
import NutritionCalendarPage from './pages/NutritionCalendarPage';
import WorkoutCalendarPage from './pages/WorkoutCalendarPage';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/workout" element={<ActiveWorkout />} />
        <Route path="/history" element={<History />} />
        <Route path="/exercises" element={<ExerciseLibrary />} />
        <Route path="/workout/:id" element={<WorkoutDetail />} />
        <Route path="/progress" element={<ExerciseProgress />} />
        <Route path="/nutrition" element={<NutritionDashboard />} />
        <Route path="/nutrition/library" element={<FoodLibrary />} />
        <Route path="/nutrition/calendar" element={<NutritionCalendarPage />} />
        <Route path="/workout-calendar" element={<WorkoutCalendarPage />} />
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App