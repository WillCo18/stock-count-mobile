import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { StaffProvider } from "./contexts/StaffContext";
import Index from "./pages/index";
import Groups from "./pages/Groups";
import GroupDetail from "./pages/GroupDetail";
import FinalizeCount from "./pages/FinalizeCount";
import ClearCounts from "./pages/ClearCounts";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <StaffProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/groups" element={<Groups />} />
            <Route path="/groups/:groupId" element={<GroupDetail />} />
            <Route path="/finalize" element={<FinalizeCount />} />
            <Route path="/clear" element={<ClearCounts />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </StaffProvider>
  </QueryClientProvider>
);

export default App;
