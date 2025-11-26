import { MobileLayout } from "@/layouts/MobileLayout";
import { Card } from "@/components/ui/card";
import { useStaff } from "@/contexts/StaffContext";
import { useQuery } from "@tanstack/react-query";
import { fetchActiveGroups } from "@/lib/airtable";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";

export default function Groups() {
  const { staffName } = useStaff();
  const navigate = useNavigate();

  const { data: groups, isLoading, error } = useQuery({
    queryKey: ["groups"],
    queryFn: fetchActiveGroups,
  });

  const handleGroupSelect = (groupNumber: string, isCompleted: boolean) => {
    if (!isCompleted) {
      navigate(`/groups/${groupNumber}`);
    }
  };

  return (
    <MobileLayout title="Counting Groups">
      <div className="space-y-6">
        {/* Staff context display */}
        <div className="rounded-lg border border-border bg-card/50 p-4">
          <p className="text-sm text-muted-foreground">
            Counting as <span className="font-semibold text-foreground">{staffName}</span>
          </p>
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {/* Error state */}
        {error && (
          <Card className="p-6 text-center">
            <p className="text-sm text-destructive">
              Failed to load groups. Please try again.
            </p>
          </Card>
        )}

        {/* Empty state */}
        {!isLoading && !error && groups?.length === 0 && (
          <Card className="p-6 text-center">
            <p className="text-sm text-muted-foreground">
              No groups available at this time.
            </p>
          </Card>
        )}

        {/* Groups list */}
        {!isLoading && !error && groups && groups.length > 0 && (
          <div className="space-y-3">
            {groups.map((group) => (
              <button
                key={group.group_number}
                onClick={() => handleGroupSelect(group.group_number, group.completed)}
                disabled={group.completed}
                className={`
                  w-full rounded-lg border p-6 text-left transition-all
                  ${
                    group.completed
                      ? "cursor-not-allowed border-border/50 bg-muted/30 opacity-60"
                      : "border-border bg-card hover:border-primary hover:bg-accent active:scale-[0.98]"
                  }
                `}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="mb-1 text-sm font-medium text-muted-foreground">
                      Group {group.group_number}
                    </div>
                    <div className="text-lg font-semibold text-foreground">
                      {group.group_name}
                    </div>
                  </div>
                  {group.completed && (
                    <div className="shrink-0 rounded-full bg-primary/10 px-3 py-1">
                      <span className="text-xs font-medium text-primary">
                        Completed
                      </span>
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </MobileLayout>
  );
}
