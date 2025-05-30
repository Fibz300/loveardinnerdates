import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useState, useEffect } from "react";

import Navigation from "./components/navigation";
import Home from "./pages/home";
import Auth from "./pages/auth";
import Profile from "./pages/profile";
import Discover from "./pages/discover";
import ArView from "./pages/ar-view";
import Matches from "./pages/matches";
import Messages from "./pages/messages";
import VideoCall from "./pages/video-call";
import BlindDate from "./pages/blind-date";
import Wallet from "./pages/wallet";
import NotFound from "./pages/not-found";

import { User } from "@shared/schema";

function Router() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    // Check for stored user session
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      setCurrentUser(JSON.parse(storedUser));
    }
  }, []);

  if (!currentUser) {
    return <Auth onLogin={setCurrentUser} />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation user={currentUser} onLogout={() => {
        setCurrentUser(null);
        localStorage.removeItem('currentUser');
      }} />
      
      <div className="pb-16">
        <Switch>
          <Route path="/" component={() => <Home user={currentUser} />} />
          <Route path="/discover" component={() => <Discover user={currentUser} />} />
          <Route path="/ar" component={() => <ArView user={currentUser} />} />
          <Route path="/matches" component={() => <Matches user={currentUser} />} />
          <Route path="/messages/:matchId?" component={() => <Messages user={currentUser} />} />
          <Route path="/video-call/:matchId" component={() => <VideoCall user={currentUser} />} />
          <Route path="/profile" component={() => <Profile user={currentUser} onUpdate={setCurrentUser} />} />
          <Route path="/blind-date" component={() => <BlindDate user={currentUser} />} />
          <Route path="/wallet" component={() => <Wallet user={currentUser} onUpdate={setCurrentUser} />} />
          <Route component={NotFound} />
        </Switch>
      </div>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
