import { lazy, Suspense } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { AuthProvider } from "@/modules/auth/context/AuthProvider";
import { useAuth } from "@/modules/auth/hooks/useAuth";
import { useProfile } from "@/modules/auth/hooks/useProfile";
import { useUserRole } from "@/modules/auth/hooks/useUserRole";
import { calculateAge, dateToIso } from "@/modules/onboarding/utils";
import { calculateBMR, calculateCalorieTarget } from "@/lib/nutrition";
import { PageTransition } from "@/modules/layout/components/PageTransition";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { FitSoulLogo } from "@/components/FitSoulLogo";
import { AnimatePresence } from "framer-motion";
import type { OnboardingData } from "@/modules/onboarding/types";

/* ── Eagerly loaded (critical path) ── */
import AuthPage from "@/modules/auth/pages/AuthPage";
import ResetPasswordPage from "@/modules/auth/pages/ResetPasswordPage";
import OnboardingPage from "@/modules/onboarding/pages/OnboardingPage";
import { AppLayout } from "@/modules/layout/components/AppLayout";

/* ── Lazy-loaded pages (athlete) ── */
const DashboardPage = lazy(() => import("@/modules/dashboard/pages/DashboardPage"));
const WorkoutsPage = lazy(() => import("@/modules/workouts/pages/WorkoutsPage"));
const DietPage = lazy(() => import("@/modules/diet/pages/DietPage"));
const ProfilePage = lazy(() => import("@/modules/profile/pages/ProfilePage"));
const TreinAIPage = lazy(() => import("@/modules/ai/pages/TreinAIPage"));
const SocialFeedPage = lazy(() => import("@/modules/social/pages/SocialFeedPage"));
const UserProfilePage = lazy(() => import("@/modules/social/pages/UserProfilePage"));
const DietAIPage = lazy(() => import("@/modules/ai/pages/DietAIPage"));
const SettingsPage = lazy(() => import("@/modules/settings/pages/SettingsPage"));
const GroupsPage = lazy(() => import("@/modules/groups/pages/GroupsPage"));
const GroupDetailPage = lazy(() => import("@/modules/groups/pages/GroupDetailPage"));
const HistoryPage = lazy(() => import("@/modules/history/pages/HistoryPage"));
const GamificationPage = lazy(() => import("@/modules/gamification/pages/GamificationPage"));
const ProgressPage = lazy(() => import("@/modules/progress/pages/ProgressPage"));

/* ── Lazy-loaded layouts & pages (admin/trainer – separate chunks) ── */
const TrainerLayout = lazy(() => import("@/modules/trainer/components/TrainerLayout").then(m => ({ default: m.TrainerLayout })));
const AdminLayout = lazy(() => import("@/modules/admin/components/AdminLayout").then(m => ({ default: m.AdminLayout })));
const TrainerDashboard = lazy(() => import("@/modules/trainer/pages/TrainerDashboard"));
const TrainerStudentsPage = lazy(() => import("@/modules/trainer/pages/TrainerStudentsPage"));
const TrainerChatPage = lazy(() => import("@/modules/trainer/pages/TrainerChatPage"));
const TrainerAnalyticsPage = lazy(() => import("@/modules/trainer/pages/TrainerAnalyticsPage"));
const AdminDashboard = lazy(() => import("@/modules/admin/pages/AdminDashboard"));
const AdminRecipesPage = lazy(() => import("@/modules/admin/pages/AdminRecipesPage"));
const AdminWorkoutsPage = lazy(() => import("@/modules/admin/pages/AdminWorkoutsPage"));
const AdminUpdatesPage = lazy(() => import("@/modules/admin/pages/AdminUpdatesPage"));
const AdminUsersPage = lazy(() => import("@/modules/admin/pages/AdminUsersPage"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,       // 5 min — avoid unnecessary refetches
      gcTime: 15 * 60 * 1000,          // 15 min — keep cache longer
      refetchOnWindowFocus: false,     // no flicker on tab switch
      retry: 1,                        // fail fast
    },
  },
});

function LoadingScreen() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-primary/6 blur-[100px] animate-pulse-glow" />
      <div className="relative flex flex-col items-center gap-6">
        <div className="relative">
          <div className="absolute inset-0 blur-2xl bg-primary/20 rounded-full scale-150" />
          <div className="relative h-16 w-16 rounded-2xl bg-card/80 backdrop-blur-sm flex items-center justify-center p-3 animate-float glow-primary-sm border border-primary/20">
            <FitSoulLogo className="w-full h-auto" color="hsl(var(--primary))" />
          </div>
        </div>
        <div className="flex flex-col items-center gap-2">
          <div className="h-1 w-24 rounded-full bg-muted overflow-hidden">
            <div className="h-full w-1/2 rounded-full bg-gradient-to-r from-primary/60 to-primary animate-shimmer" />
          </div>
          <p className="text-xs text-muted-foreground/60 animate-pulse">Carregando sua jornada...</p>
        </div>
      </div>
    </div>
  );
}

/** Inline suspense wrapper so lazy pages show a spinner while loading */
function SuspensePageTransition({ children }: { children: React.ReactNode }) {
  return (
    <PageTransition>
      <ErrorBoundary>
        <Suspense
          fallback={
            <div className="flex min-h-[200px] items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          }
        >
          {children}
        </Suspense>
      </ErrorBoundary>
    </PageTransition>
  );
}

function AppRoutes() {
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading, updateProfile, refetch } = useProfile(user);
  const { role, dbRole, loading: roleLoading, switchRole } = useUserRole(user);
  const navigate = useNavigate();
  const location = useLocation();

  // Show loading while auth is initializing
  if (authLoading) {
    return <LoadingScreen />;
  }

  // Not logged in — show auth routes
  if (!user) {
    return (
      <Routes>
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="*" element={<AuthPage />} />
      </Routes>
    );
  }

  // Logged in but still loading profile/role
  if (profileLoading || roleLoading) {
    return <LoadingScreen />;
  }

  // Logged in, profile exists but onboarding not completed
  if (profile && !profile.onboarding_completed) {
    return (
      <OnboardingPage
        onComplete={async (data: OnboardingData) => {
          const age = calculateAge(data.date_of_birth);
          const bmr = calculateBMR(data.gender, data.weight_kg, data.height_cm, age);
          const calorie_target = calculateCalorieTarget(bmr, data.activity_level, data.goal);
          const dateIso = dateToIso(data.date_of_birth);
          const { error } = await updateProfile({
            name: data.name,
            username: data.username,
            date_of_birth: dateIso,
            gender: data.gender,
            height_cm: data.height_cm,
            weight_kg: data.weight_kg,
            goal: data.goal,
            activity_level: data.activity_level,
            age,
            bmr,
            calorie_target,
            injuries: data.injuries,
            allergies: data.allergies,
            dietary_restrictions: data.dietary_restrictions,
            onboarding_completed: true,
          });
          if (error) {
            console.error("Failed to save onboarding:", error);
            throw error;
          }
          await refetch();
        }}
      />
    );
  }

  // Profile still null after loading — sign out so user can try again
  if (!profile) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-4 text-center">
        <p className="text-muted-foreground">Não foi possível carregar seu perfil.</p>
        <button
          onClick={async () => {
            await supabase.auth.signOut();
            window.location.reload();
          }}
          className="rounded-md bg-primary px-4 py-2 text-primary-foreground"
        >
          Sair e tentar novamente
        </button>
      </div>
    );
  }

  const handleSwitchRole = async (newRole: "athlete" | "professional" | "admin") => {
    await switchRole(newRole);
    if (newRole === "professional") navigate("/trainer");
    else if (newRole === "admin") navigate("/admin");
    else navigate("/");
  };

  // Admin routes
  if (role === "admin") {
    return (
      <Suspense fallback={<LoadingScreen />}>
        <AdminLayout onSwitchRole={handleSwitchRole}>
          <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname}>
              <Route path="/admin" element={<SuspensePageTransition><AdminDashboard /></SuspensePageTransition>} />
              <Route path="/admin/recipes" element={<SuspensePageTransition><AdminRecipesPage /></SuspensePageTransition>} />
              <Route path="/admin/workouts" element={<SuspensePageTransition><AdminWorkoutsPage /></SuspensePageTransition>} />
              <Route path="/admin/updates" element={<SuspensePageTransition><AdminUpdatesPage /></SuspensePageTransition>} />
              <Route path="/admin/users" element={<SuspensePageTransition><AdminUsersPage /></SuspensePageTransition>} />
              <Route path="/admin/groups" element={<SuspensePageTransition><GroupsPage /></SuspensePageTransition>} />
              <Route path="/admin/groups/:groupId" element={<SuspensePageTransition><GroupDetailPage /></SuspensePageTransition>} />
              <Route path="/admin/analytics" element={<SuspensePageTransition><TrainerAnalyticsPage /></SuspensePageTransition>} />
              <Route path="/profile" element={<SuspensePageTransition><ProfilePage profile={profile} onUpdate={updateProfile} userRole={role} onSwitchRole={handleSwitchRole} /></SuspensePageTransition>} />
              <Route path="/settings" element={<SuspensePageTransition><SettingsPage dbRole={dbRole} activeRole={role} onSwitchRole={handleSwitchRole} /></SuspensePageTransition>} />
              <Route path="*" element={<Navigate to="/admin" replace />} />
            </Routes>
          </AnimatePresence>
        </AdminLayout>
      </Suspense>
    );
  }

  // Professional / Trainer routes
  if (role === "professional") {
    return (
      <Suspense fallback={<LoadingScreen />}>
        <TrainerLayout onSwitchRole={handleSwitchRole}>
          <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname}>
              <Route path="/trainer" element={<SuspensePageTransition><TrainerDashboard /></SuspensePageTransition>} />
              <Route path="/trainer/students" element={<SuspensePageTransition><TrainerStudentsPage /></SuspensePageTransition>} />
              <Route path="/trainer/workouts" element={<SuspensePageTransition><WorkoutsPage /></SuspensePageTransition>} />
              <Route path="/trainer/analytics" element={<SuspensePageTransition><TrainerAnalyticsPage /></SuspensePageTransition>} />
              <Route path="/trainer/chat" element={<SuspensePageTransition><TrainerChatPage /></SuspensePageTransition>} />
              <Route path="/trainer/diet" element={<SuspensePageTransition><DietPage profile={profile} /></SuspensePageTransition>} />
              <Route path="/trainer/progress" element={<SuspensePageTransition><ProgressPage /></SuspensePageTransition>} />
              <Route path="/trainer/groups" element={<SuspensePageTransition><GroupsPage /></SuspensePageTransition>} />
              <Route path="/trainer/groups/:groupId" element={<SuspensePageTransition><GroupDetailPage /></SuspensePageTransition>} />
              <Route path="/trainer/ai-trainer" element={<SuspensePageTransition><TreinAIPage /></SuspensePageTransition>} />
              <Route path="/profile" element={<SuspensePageTransition><ProfilePage profile={profile} onUpdate={updateProfile} userRole={role} onSwitchRole={handleSwitchRole} /></SuspensePageTransition>} />
              <Route path="/settings" element={<SuspensePageTransition><SettingsPage dbRole={dbRole} activeRole={role} onSwitchRole={handleSwitchRole} /></SuspensePageTransition>} />
              <Route path="*" element={<Navigate to="/trainer" replace />} />
            </Routes>
          </AnimatePresence>
        </TrainerLayout>
      </Suspense>
    );
  }

  // Athlete routes
  return (
    <AppLayout profile={profile} onProfileUpdate={refetch}>
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<SuspensePageTransition><DashboardPage profile={profile} /></SuspensePageTransition>} />
          <Route path="/workouts" element={<SuspensePageTransition><WorkoutsPage /></SuspensePageTransition>} />
          <Route path="/diet" element={<SuspensePageTransition><DietPage profile={profile} /></SuspensePageTransition>} />
          <Route path="/social" element={<SuspensePageTransition><SocialFeedPage /></SuspensePageTransition>} />
          <Route path="/user/:userId" element={<SuspensePageTransition><UserProfilePage /></SuspensePageTransition>} />
          <Route path="/ai-trainer" element={<SuspensePageTransition><TreinAIPage /></SuspensePageTransition>} />
          <Route path="/ai-chef" element={<SuspensePageTransition><DietAIPage /></SuspensePageTransition>} />
          <Route path="/groups" element={<SuspensePageTransition><GroupsPage /></SuspensePageTransition>} />
          <Route path="/groups/:groupId" element={<SuspensePageTransition><GroupDetailPage /></SuspensePageTransition>} />
          <Route path="/history" element={<SuspensePageTransition><HistoryPage /></SuspensePageTransition>} />
          <Route path="/achievements" element={<SuspensePageTransition><GamificationPage /></SuspensePageTransition>} />
          <Route path="/progress" element={<SuspensePageTransition><ProgressPage /></SuspensePageTransition>} />
          <Route path="/profile" element={<SuspensePageTransition><ProfilePage profile={profile} onUpdate={updateProfile} userRole={role} onSwitchRole={handleSwitchRole} /></SuspensePageTransition>} />
          <Route path="/settings" element={<SuspensePageTransition><SettingsPage dbRole={dbRole} activeRole={role} onSwitchRole={handleSwitchRole} /></SuspensePageTransition>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AnimatePresence>
    </AppLayout>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ErrorBoundary>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </ErrorBoundary>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
