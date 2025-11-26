import { MobileLayout } from "@/layouts/MobileLayout";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useStaff } from "@/contexts/StaffContext";
import { useQuery } from "@tanstack/react-query";
import { fetchAllGroups, fetchProductsByGroup, AirtableProduct } from "@/lib/airtable";
import { useNavigate } from "react-router-dom";
import { Loader2, Search } from "lucide-react";
import { useMemo, useState, useEffect } from "react";

export default function Groups() {
  const { staffName } = useStaff();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch ALL groups (completed + not completed)
  const {
    data: groups,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["groups"],
    queryFn: fetchAllGroups,
  });

  // State to track loaded product data
  const [productsData, setProductsData] = useState<Record<string, AirtableProduct[]>>({});
  const [loadingGroups, setLoadingGroups] = useState<Set<string>>(new Set());

  // Sequentially fetch products with delays to avoid rate limits
  useEffect(() => {
    if (!groups || groups.length === 0) return;

    let cancelled = false;
    const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    const fetchSequentially = async () => {
      for (const group of groups) {
        if (cancelled) break;

        // Skip if already loaded
        if (productsData[group.group_number]) continue;

        setLoadingGroups((prev) => new Set(prev).add(group.group_number));

        try {
          const products = await fetchProductsByGroup(group.group_number);
          if (!cancelled) {
            setProductsData((prev) => ({ ...prev, [group.group_number]: products }));
            setLoadingGroups((prev) => {
              const next = new Set(prev);
              next.delete(group.group_number);
              return next;
            });
          }
        } catch (err) {
          console.error(`Failed to fetch products for group ${group.group_number}:`, err);
          if (!cancelled) {
            setProductsData((prev) => ({ ...prev, [group.group_number]: [] }));
            setLoadingGroups((prev) => {
              const next = new Set(prev);
              next.delete(group.group_number);
              return next;
            });
          }
        }

        // Wait 200ms between requests to avoid rate limiting
        await delay(200);
      }
    };

    fetchSequentially();

    return () => {
      cancelled = true;
    };
  }, [groups]);

  const groupStats = useMemo(() => {
    const stats: Record<
      string,
      {
        totalProducts: number;
        fullyCounted: number;
        zeroStock: number;
        statusLabel: string;
        isLoading: boolean;
      }
    > = {};

    groups?.forEach((group) => {
      const products = productsData[group.group_number] || [];
      const isLoading = loadingGroups.has(group.group_number);

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
      let statusLabel = "Not started";
      if (group.completed) {
        statusLabel = "Completed";
      } else if (notStarted === totalProducts) {
        statusLabel = "Not started";
      } else {
        statusLabel = "In progress";
      }

      stats[group.group_number] = {
        totalProducts,
        fullyCounted,
        zeroStock,
        statusLabel,
        isLoading,
      };
    });

    return stats;
  }, [productsData, groups, loadingGroups]);

  // Filter groups based on search query
  const filteredGroups = useMemo(() => {
    if (!groups) return [];
    if (!searchQuery.trim()) return groups;

    const query = searchQuery.toLowerCase();
    return groups.filter(
      (group) => group.group_name.toLowerCase().includes(query) || group.group_number.toLowerCase().includes(query),
    );
  }, [groups, searchQuery]);

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

        {/* Search bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search groups…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
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
            <p className="text-sm text-destructive">Failed to load groups. Please try again.</p>
          </Card>
        )}

        {/* Empty state */}
        {!isLoading && !error && groups?.length === 0 && (
          <Card className="p-6 text-center">
            <p className="text-sm text-muted-foreground">No groups available at this time.</p>
          </Card>
        )}

        {/* No search results */}
        {!isLoading && !error && groups && groups.length > 0 && filteredGroups.length === 0 && (
          <Card className="p-6 text-center">
            <p className="text-sm text-muted-foreground">No groups match your search.</p>
          </Card>
        )}

        {/* Groups list */}
        {!isLoading && !error && filteredGroups && filteredGroups.length > 0 && (
          <div className="space-y-3">
            {filteredGroups.map((group) => {
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
                      <div className="text-lg font-semibold text-foreground mb-2">{group.group_name}</div>
                      {stats && (
                        <div className="text-sm text-muted-foreground space-y-1">
                          {stats.isLoading ? (
                            <div className="flex items-center gap-2">
                              <Loader2 className="h-3 w-3 animate-spin" />
                              <span>Loading products...</span>
                            </div>
                          ) : (
                            <>
                              <div>
                                {stats.fullyCounted} / {stats.totalProducts} counted
                                {stats.zeroStock > 0 && <> • {stats.zeroStock} zero-stock</>}
                              </div>
                              <div className="font-medium">Status: {stats.statusLabel}</div>
                            </>
                          )}
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
