import { useParams } from "react-router-dom";
import { MobileLayout } from "@/layouts/MobileLayout";
import { Card } from "@/components/ui/card";

/**
 * Group detail page placeholder
 * TODO: Display products for selected group and counting interface
 */
export default function GroupDetail() {
  const { groupId } = useParams();

  return (
    <MobileLayout title={`Group ${groupId}`}>
      <div className="space-y-4">
        <Card className="p-6 text-center">
          <h2 className="mb-4 text-2xl font-bold text-foreground">
            Products in Group {groupId}
          </h2>
          <p className="text-muted-foreground">
            Product list and counting interface will be implemented here
          </p>
        </Card>
      </div>
    </MobileLayout>
  );
}
