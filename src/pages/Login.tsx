import { MobileLayout } from "@/layouts/MobileLayout";
import { Card } from "@/components/ui/card";

/**
 * Login page placeholder
 * TODO: Implement user authentication
 */
export default function Login() {
  return (
    <MobileLayout title="Login">
      <div className="flex min-h-[60vh] items-center justify-center">
        <Card className="w-full p-8 text-center">
          <h2 className="mb-4 text-2xl font-bold text-foreground">
            User Login
          </h2>
          <p className="text-muted-foreground">
            Authentication will be implemented here
          </p>
        </Card>
      </div>
    </MobileLayout>
  );
}
