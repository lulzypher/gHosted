import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { UserProvider } from "./contexts/UserContext";
import { IPFSProvider } from "./contexts/IPFSContext";
import { OrbitDBProvider } from "./contexts/OrbitDBContext";
import { WebSocketProvider } from "./contexts/WebSocketContext";

// Pages
import Home from "@/pages/home";
import Profile from "@/pages/profile";
import Settings from "@/pages/settings";
import Storage from "@/pages/storage";
import Login from "@/pages/login";
import Register from "@/pages/register";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/profile" component={Profile} />
      <Route path="/settings" component={Settings} />
      <Route path="/storage" component={Storage} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <UserProvider>
        <WebSocketProvider>
          <IPFSProvider>
            <OrbitDBProvider>
              <Router />
              <Toaster />
            </OrbitDBProvider>
          </IPFSProvider>
        </WebSocketProvider>
      </UserProvider>
    </QueryClientProvider>
  );
}

export default App;
