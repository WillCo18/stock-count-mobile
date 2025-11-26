import { MobileLayout } from "@/layouts/MobileLayout";
import { Card } from "@/components/ui/card";

/**
 * Groups listing page placeholder
 * TODO: Display all active counting groups from Airtable
 */
export default function Groups() {
  return (
    <MobileLayout title="Counting Groups">
      <div className="space-y-4">
        <Card className="p-6 text-center">
          <h2 className="mb-4 text-2xl font-bold text-foreground">
            Active Groups
          </h2>
          <p className="text-muted-foreground">
            Group list will be loaded from Airtable
          </p>
        </Card>
      </div>
    </MobileLayout>
  );
}
