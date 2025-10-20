import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useState, useEffect } from "react";
import Index from "./pages/Index";
import Profile from "./pages/Profile";
import Analytics from "./pages/Analytics";
import AIAgent from "./pages/AIAgent";
import LearnMore from "./pages/LearnMore";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";
import { ScrollToTopButton } from "./components/ScrollToTopButton";
import ManageTransactions from "./pages/ManageTransactions";
import { ThemeProvider } from "./contexts/ThemeContext";

const queryClient = new QueryClient();

const App = () => {
  console.log('App component rendering...');
  
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      console.error('Global error caught:', event.error);
      setError(event.error);
    };

    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  if (error) {
    return (
      <div className="min-h-screen bg-red-900 text-white flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Something went wrong</h1>
          <p className="mb-4">{error.message}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-white text-red-900 rounded"
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <ScrollToTopButton />
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/ai-agent" element={<AIAgent />} />
              <Route path="/learn-more" element={<LearnMore />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/manage-transactions" element={<ManageTransactions />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
};

export default App;