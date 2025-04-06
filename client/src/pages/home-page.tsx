import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export default function HomePage() {
  const { user, logoutMutation } = useAuth();

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col items-center justify-center min-h-[80vh]">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl">Welcome to gHosted!</CardTitle>
            <CardDescription>
              You are now logged in to the decentralized social platform
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 bg-primary/10 rounded-lg">
                <h3 className="font-medium text-lg">Your Profile</h3>
                <p><span className="font-medium">Username:</span> {user?.username}</p>
                <p><span className="font-medium">Display Name:</span> {user?.displayName}</p>
                {user?.bio && <p><span className="font-medium">Bio:</span> {user?.bio}</p>}
              </div>
              
              <div className="p-4 bg-muted rounded-lg">
                <h3 className="font-medium text-lg">Decentralized Identity</h3>
                <p className="mb-1"><span className="font-medium">DID:</span></p>
                <div className="p-2 bg-background rounded text-xs break-all">
                  {user?.did}
                </div>
                <p className="mt-2 mb-1"><span className="font-medium">Public Key:</span></p>
                <div className="p-2 bg-background rounded text-xs break-all">
                  {user?.publicKey}
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              variant="outline" 
              className="w-full" 
              onClick={handleLogout}
              disabled={logoutMutation.isPending}
            >
              {logoutMutation.isPending ? "Logging out..." : "Logout"}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}