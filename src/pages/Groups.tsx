import { MobileLayout } from "@/layouts/MobileLayout";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useStaff } from "@/contexts/StaffContext";
import { useQuery } from "@tanstack/react-query";
import { fetchAllGroups, fetchProductsByGroup } from "@/lib/airtable";
import { useNavigate } from "react-router-dom";
import { Loader2, Search } from "lucide-react";
import { useMemo, useState, useEffect } from "react";

function Groups() {
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

  // Debug logging for groups data
  useEffect(() => {
    console.log("===== GROUPS DEBUG =====");
    console.log("Total groups:", groups?.length);
    console.log("All groups:", groups);
    console.log("Completed groups:", groups?.filter(g => g.completed));
  }, [groups]);

  // State to track loaded product data
  const [productsData, setProductsData] = useState({});
  const [loadingGroups, setLoadingGroups] = useState(new Set());

  // Sequentially fetch products with delays to avoid rate limits
  useEffect(() => {
    if (!groups || groups.length === 0) return;

    let cancelled = false;
    const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    const fetchSequentially = async () => {
      for (const group of groups) {
        if (cancelled) break;

        const groupId = String(group.group_number);

        // Skip if already loaded
        if (productsData[groupId]) continue;

        setLoadingGroups((prev) => {
          const next = new Set(prev);
          next.add(groupId);
          return next;
        });

        try {
          const products = await fetchProductsByGroup(groupId);
          if (!cancelled) {
            setProductsData((prev) => ({ ...prev, [groupId]: products }));
            setLoadingGroups((prev) => {
              const next = new Set(prev);
              next.delete(groupId);
              return next;
            });
          }
        } catch (err) {
          console.error(`Failed to fetch products for group ${groupId}:`, err);
          if (!cancelled) {
            setProductsData((prev) => ({ ...prev, [groupId]: [] }));
            setLoadingGroups((prev) => {
              const next = new Set(prev);
              next.delete(groupId);
              return next;
            });
          }
        }

        await delay(200);
      }
    };

    fetchSequentially();

    return () => {
      cancelled = true;
    };
  }, [groups]);

  const groupStats = useMemo(() => {
    const stats = {};

    if (!groups) return stats;

    groups.forEach((group) => {
      const groupId = String(group.group_number);
      const products = productsData[groupId] || [];
      const isLoading = loadingGroups.has(groupId);

      const totalProducts = products.length;
      let fullyCounted = 0;
      let zeroStock = 0;
      let notStarted = 0;

      products.forEach((p) => {
        const hasFront = p.fields?.front_count !== null && p.fields?.front_count !== undefined;
        const hasBack = p.fields?.back_count !== null && p.fields?.back_count !== undefined;

        if (hasFront && hasBack) {
          fullyCounted++;
          if (p.fields.front_count === 0 && p.fields.back_count === 0) {
            zeroStock++;
          }
        } else if (!hasFront && !hasBack) {
          notStarted++;
        }
      });

      // Determine if all products are fully counted
      const allCounted = totalProducts > 0 && fullyCounted === totalProducts;
      // Determine if some products are counted (partial progress)
      const someProgress = fullyCounted > 0 || (totalProducts - notStarted) > 0;

      // Status is based on actual product counts, NOT the Airtable "completed" field
      let statusLabel = "Not started";
      if (allCounted) {
        statusLabel = "Completed";
      } else if (someProgress && fullyCounted < totalProducts) {
        statusLabel = "In progress";
      }

      stats[groupId] = {
        totalProducts,
        fullyCounted,
        zeroStock,
        statusLabel,
        isLoading,
        allCounted,
        someProgress,
      };
    });

    return stats;
  }, [productsData, groups, loadingGroups]);

  // Filter and sort groups based on search query
  // Uncompleted groups appear first, then completed groups
  // Both sorted alphabetically by group name
  const filteredGroups = useMemo(() => {
    if (!groups) return [];

    let filtered = groups;

    // Filter based on search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = groups.filter((group) => {
        const name = (group.group_name || "").toLowerCase();
        const num = String(group.group_number || "").toLowerCase();
        return name.includes(query) || num.includes(query);
      });
    }

    // Sort: uncompleted first, then completed, both alphabetically
    return filtered.sort((a, b) => {
      // First, separate by completion status
      if (a.completed !== b.completed) {
        return a.completed ? 1 : -1; // Uncompleted (false) comes first
      }
      
      // If same completion status, sort alphabetically by name
      const nameA = (a.group_name || `Group ${a.group_number}`).toLowerCase();
      const nameB = (b.group_name || `Group ${b.group_number}`).toLowerCase();
      return nameA.localeCompare(nameB);
    });
  }, [groups, searchQuery]);

  const handleGroupSelect = (groupNumber) => {
    navigate(`/groups/${String(groupNumber)}`);
  };

  return (
    <MobileLayout title="Counting Groups">
      <div className="space-y-6">
        <div className="rounded-lg border border-border bg-white p-4 shadow-md">
          <p className="text-sm text-muted-foreground">
            Counting as <span className="font-semibold text-foreground">{staffName}</span>
          </p>
        </div>

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

        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {error && (
          <Card className="p-6 text-center">
            <p className="text-sm text-destructive">Failed to load groups. Please try again.</p>
          </Card>
        )}

        {!isLoading && !error && groups?.length === 0 && (
          <Card className="p-6 text-center">
            <p className="text-sm text-muted-foreground">No groups available at this time.</p>
          </Card>
        )}

        {!isLoading && !error && groups && groups.length > 0 && filteredGroups.length === 0 && (
          <Card className="p-6 text-center">
            <p className="text-sm text-muted-foreground">No groups match your search.</p>
          </Card>
        )}

        {!isLoading && !error && filteredGroups && filteredGroups.length > 0 && (
          <div className="space-y-3">
            {filteredGroups.map((group) => {
              const groupId = String(group.group_number);
              const stats = groupStats[groupId] || {
                totalProducts: 0,
                fullyCounted: 0,
                zeroStock: 0,
                statusLabel: group.completed ? "Completed" : "Not started",
                isLoading: true,
              };

              const getCardStyles = () => {
                if (stats.allCounted || group.completed) {
                  return "border-status-complete bg-status-complete-bg hover:bg-status-complete-bg/80";
                }
                if (stats.someProgress) {
                  return "border-status-partial bg-status-partial-bg hover:bg-status-partial-bg/80";
                }
                return "border-border bg-white hover:border-primary hover:bg-gray-50";
              };

              return (
                <button
                  key={groupId}
                  onClick={() => handleGroupSelect(groupId)}
                  className={`
                    w-full rounded-lg border p-6 text-left transition-all shadow-md active:scale-[0.98]
                    ${getCardStyles()}
                  `}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="text-lg font-semibold text-foreground mb-2">
                        {group.group_name || `Group ${groupId}`}
                      </div>

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

export default Groups;
