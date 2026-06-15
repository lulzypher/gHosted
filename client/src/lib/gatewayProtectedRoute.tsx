import { useGatewaySession } from "@/contexts/GatewaySession";
import { Loader2 } from "lucide-react";
import { Redirect, Route, type RouteProps } from "wouter";

interface Props extends Omit<RouteProps, "component"> {
  component: React.ComponentType;
}

export function GatewayProtectedRoute({ path, component: Component, ...rest }: Props) {
  const { session, isLoading } = useGatewaySession();

  if (isLoading) {
    return (
      <Route path={path} {...rest}>
        <div className="min-h-screen ghost-telegram flex items-center justify-center bg-tg-bg">
          <Loader2 className="h-8 w-8 animate-spin text-tg-muted" />
        </div>
      </Route>
    );
  }

  return (
    <Route path={path} {...rest}>
      {session ? <Component /> : <Redirect to="/identity" />}
    </Route>
  );
}
