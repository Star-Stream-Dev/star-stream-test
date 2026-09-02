import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { DMNotificationProvider } from "@/contexts/DMNotificationContext";
import { PresenceProvider } from "@/contexts/PresenceContext";
import { GameLayoutProvider } from "@/contexts/GameLayoutContext";
import { UserPreferencesProvider } from "@/contexts/UserPreferencesContext";
import { DMNotificationBanner } from "@/components/DMNotificationBanner";
import Index from "./pages/Index";
import InviteSignup from "./pages/InviteSignup";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <PresenceProvider>
        <DMNotificationProvider>
          <GameLayoutProvider>
            <UserPreferencesProvider>
              <TooltipProvider>
                <Toaster />
                <Sonner />
                <DMNotificationBanner />
                <BrowserRouter>
                  <Routes>
                    <Route path="/" element={<Index />} />
                    <Route path="/invite/:code" element={<InviteSignup />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </BrowserRouter>
              </TooltipProvider>
            </UserPreferencesProvider>
          </GameLayoutProvider>
        </DMNotificationProvider>
      </PresenceProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
