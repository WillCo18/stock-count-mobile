import { MobileLayout } from "@/layouts/MobileLayout";
import { Card } from "@/components/ui/card";
import { useStaff } from "@/contexts/StaffContext";
import { useQuery } from "@tanstack/react-query";
import { fetchActiveGroups, fetchProductsByGroup, AirtableProduct } from "@/lib/airtable";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useMemo } from "react";

export default function Groups() {
  const { staffName } = useStaff();
  const navigate = useNavigate();

  const { data: groups, isLoading, error } = useQuery({
    queryKey: ["groups"],
    queryFn: fetchActiveGroups,
  });

  // Fetch products for all groups to compute summary stats
  const groupProductsQueries = useQuery({
    queryKey: ["all-group-products", groups?.map(g => g.group_number)],
    queryFn: async () => {
      if (!groups) return {};
      const results: Record<string, AirtableProduct[]> = {};
      await Promise.all(
        groups.map(async (group) => {
          try {
            const products = await fetchProductsByGroup(group.group_number);
            results[group.group_number] = products;
          } catch (error) {
            console.error(`Failed to fetch products for group ${group.group_number}:`, error);
            results[group.group_number] = [];
          }
        })
      );
      return results;
    },
    enabled: !!groups && groups.length > 0,
  });

  const groupStats = useMemo(() => {
    if (!groupProductsQueries.data) return {};
    
    const stats: Record<string, {
      totalProducts: number;
      fullyCounted: number;
      zeroStock: number;
      statusLabel: string;
    }> = {};

    Object.entries(groupProductsQueries.data).forEach(([groupNumber, products]) => {
      const totalProducts = products.length;
      let fullyCounted = 0;
      let zeroStock = 0;
      let notStarted = 0;

      products.forEach((p) => {
        const hasFront = p.fields.front_count !== null && p.fields.front_count !== undefined;
        const hasBack = p.fields.back_count !== null && p.fields.back_count !== undefined;
        
        if (hasFront && hasBack) {
          // Both values are saved
          if (p.fields.front_count === 0 && p.fields.back_count === 0) {
            zeroStock++;
          } else if (p.fields.front_count > 0 || p.fields.back_count > 0) {
            fullyCounted++;
          }
        } else if (!hasFront && !hasBack) {
          notStarted++;
        }
      });

      // Determine status label
      const group = groups?.find(g => g.group_number === groupNumber);
      let statusLabel = "Not started";
      if (group?.completed) {
        statusLabel = "Completed";
      } else if (notStarted === totalProducts) {
        statusLabel = "Not started";
      } else {
        statusLabel = "In progress";
      }

      stats[groupNumber] = {
        totalProducts,
        fullyCounted,
        zeroStock,
        statusLabel,
      };
    });

    return stats;
  }, [groupProductsQueries.data, groups]);

  const handleGroupSelect = (groupNumber: string) => {
    navigate(`/groups/${groupNumber}`);
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
        {(isLoading || groupProductsQueries.isLoading) && (
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
        {!isLoading && !groupProductsQueries.isLoading && !error && groups && groups.length > 0 && (
          <div className="space-y-3">
            {groups.map((group) => {
              const stats = groupStats[group.group_number];
              const isCompleted = group.completed;
              
              return (
                <button
                  key={group.group_number}
                  onClick={() => handleGroupSelect(group.group_number)}
                  className={`
                    w-full rounded-lg border p-6 text-left transition-all
                    ${
                      isCompleted
                        ? "border-border/50 bg-muted/20 opacity-75"
                        : "border-border bg-card hover:border-primary hover:bg-accent active:scale-[0.98]"
                    }
                  `}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="text-lg font-semibold text-foreground mb-2">
                        {group.group_name}
                      </div>
                      {stats && (
                        <div className="text-sm text-muted-foreground space-y-1">
                          <div>
                            {stats.fullyCounted} / {stats.totalProducts} counted
                            {stats.zeroStock > 0 && (
                              <> • {stats.zeroStock} zero-stock</>
                            )}
                          </div>
                          <div className="font-medium">
                            Status: {stats.statusLabel}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </MobileLayout>
  );
}
