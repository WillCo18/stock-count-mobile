import { MobileLayout } from "@/layouts/MobileLayout";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { fetchAllGroups, fetchProductsByGroup } from "@/lib/airtable";
import { Loader2, AlertTriangle } from "lucide-react";
import { useMemo, useState, useEffect } from "react";
import { toast } from "@/hooks/use-toast";
import { useStaff } from "@/contexts/StaffContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function FinalizeCount() {
  const { staffName } = useStaff();
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const isSimon = staffName === "Simon";

  // Fetch ALL groups
  const {
    data: groups,
    isLoading: groupsLoading,
    error: groupsError,
  } = useQuery({
    queryKey: ["groups"],
    queryFn: fetchAllGroups,
  });

  // State to track loaded product data
  const [productsData, setProductsData] = useState<Record<string, any[]>>({});
  const [loadingGroups, setLoadingGroups] = useState(new Set<string>());
  const [isExporting, setIsExporting] = useState(false);

  // Sequentially fetch products with delays to avoid rate limits
  useEffect(() => {
    if (!groups || groups.length === 0) return;

    let cancelled = false;
    const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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

  // Calculate stats for each group
  const groupStats = useMemo(() => {
    const stats: Record<string, {
      isCounted: boolean;
      productsNotCounted: number;
      totalProducts: number;
    }> = {};

    if (!groups) return stats;

    groups.forEach((group) => {
      const groupId = String(group.group_number);
      const products = productsData[groupId] || [];
      const isLoading = loadingGroups.has(groupId);

      const totalProducts = products.length;
      let productsNotCounted = 0;

      products.forEach((p) => {
        const hasFront = p.fields?.front_count !== null && p.fields?.front_count !== undefined;
        const hasBack = p.fields?.back_count !== null && p.fields?.back_count !== undefined;

        if (!hasFront || !hasBack) {
          productsNotCounted++;
        }
      });

      stats[groupId] = {
        isCounted: group.completed || (totalProducts > 0 && productsNotCounted === 0 && !isLoading),
        productsNotCounted,
        totalProducts,
      };
    });

    return stats;
  }, [productsData, groups, loadingGroups]);

  // Sort groups: uncompleted first, then completed, both alphabetically
  const sortedGroups = useMemo(() => {
    if (!groups) return [];

    return [...groups].sort((a, b) => {
      const statsA = groupStats[String(a.group_number)];
      const statsB = groupStats[String(b.group_number)];

      // First, separate by completion status
      if (statsA.isCounted !== statsB.isCounted) {
        return statsA.isCounted ? 1 : -1; // Uncompleted comes first
      }

      // If same completion status, sort alphabetically by name
      const nameA = (a.group_name || `Group ${a.group_number}`).toLowerCase();
      const nameB = (b.group_name || `Group ${b.group_number}`).toLowerCase();
      return nameA.localeCompare(nameB);
    });
  }, [groups, groupStats]);

  // Handle Complete button click - show confirmation if Simon
  const handleCompleteClick = () => {
    if (!isSimon) {
      toast({
        title: "Access Denied",
        description: "Only Simon can complete the stock count.",
        variant: "destructive",
      });
      return;
    }
    setShowConfirmDialog(true);
  };

  // Export to CSV - line by line product data matching Airtable structure
  const handleExportCSV = async () => {
    if (!groups || Object.keys(productsData).length === 0) {
      toast({
        title: "Error",
        description: "No data to export. Please wait for all products to load.",
        variant: "destructive",
      });
      return;
    }

    // Check if any groups are still loading
    if (loadingGroups.size > 0) {
      toast({
        title: "Please wait",
        description: "Still loading product data. Please wait a moment.",
        variant: "destructive",
      });
      return;
    }

    setIsExporting(true);

    try {
      // Prepare CSV data - line by line product entries
      const csvRows: string[] = [];
      
      // Header row matching Airtable structure
      csvRows.push("sage_ref,plu,description,group,count");

      // Collect all products from all groups
      const allProducts: Array<{
        sage_ref: string;
        plu: string;
        description: string;
        group_number: string;
        count: number;
      }> = [];

      // Iterate through all groups and their products
      if (groups) {
        for (const group of groups) {
          const groupId = String(group.group_number);
          const products = productsData[groupId] || [];

          products.forEach((product) => {
            const frontCount = product.fields?.front_count ?? 0;
            const backCount = product.fields?.back_count ?? 0;
            const totalCount = frontCount + backCount;

            allProducts.push({
              sage_ref: product.fields?.sage_ref || "",
              plu: product.fields?.plu || "",
              description: product.fields?.description || "",
              group_number: product.fields?.group_number || groupId,
              count: totalCount,
            });
          });
        }
      }

      // Sort products by group_number, then by description for consistency
      allProducts.sort((a, b) => {
        const groupCompare = a.group_number.localeCompare(b.group_number);
        if (groupCompare !== 0) return groupCompare;
        return a.description.localeCompare(b.description);
      });

      // Add data rows
      allProducts.forEach((product) => {
        // Escape quotes in CSV fields and wrap in quotes
        const escapeCSV = (field: string | number) => {
          const str = String(field);
          if (str.includes(",") || str.includes('"') || str.includes("\n")) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        };

        csvRows.push(
          `${escapeCSV(product.sage_ref)},${escapeCSV(product.plu)},${escapeCSV(product.description)},${escapeCSV(product.group_number)},${product.count}`
        );
      });

      // Create CSV content
      const csvContent = csvRows.join("\n");

      // Create blob and download
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      
      link.setAttribute("href", url);
      link.setAttribute("download", `stock-count-final-${new Date().toISOString().split("T")[0]}.csv`);
      link.style.visibility = "hidden";
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Success",
        description: `CSV file exported successfully with ${allProducts.length} products`,
      });
    } catch (error) {
      console.error("Error exporting CSV:", error);
      toast({
        title: "Error",
        description: "Failed to export CSV file",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const isLoading = groupsLoading || Object.keys(productsData).length === 0;
  const hasLoadingGroups = loadingGroups.size > 0;
  
  // Calculate total products loaded
  const totalProductsLoaded = useMemo(() => {
    return Object.values(productsData).reduce((sum, products) => sum + products.length, 0);
  }, [productsData]);

  return (
    <MobileLayout title="Finalize Count">
      <div className="space-y-6">
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {groupsError && (
          <div className="rounded-lg border border-destructive bg-destructive/10 p-4 text-center">
            <p className="text-sm text-destructive">
              Failed to load groups. Please try again.
            </p>
          </div>
        )}

        {!isLoading && !groupsError && sortedGroups.length > 0 && (
          <>
            {/* Progress indicator */}
            {(hasLoadingGroups || isLoading) && (
              <div className="rounded-lg border border-border bg-white p-4 shadow-md">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-foreground">
                    Loading products...
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {totalProductsLoaded} products loaded
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ 
                      width: `${groups ? (Object.keys(productsData).length / groups.length) * 100 : 0}%` 
                    }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Loading groups: {loadingGroups.size} remaining
                </p>
              </div>
            )}

            {/* List/Table */}
            <div className="rounded-lg border border-border bg-white shadow-md overflow-hidden">
              <div className="divide-y divide-border">
                {/* Header */}
                <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 font-semibold text-sm text-foreground">
                  <div>Category</div>
                  <div>Has it been counted?</div>
                  <div>Products not counted</div>
                </div>

                {/* Rows */}
                {sortedGroups.map((group) => {
                  const groupId = String(group.group_number);
                  const stats = groupStats[groupId] || {
                    isCounted: false,
                    productsNotCounted: 0,
                    totalProducts: 0,
                  };
                  const isLoadingGroup = loadingGroups.has(groupId);

                  return (
                    <div
                      key={groupId}
                      className="grid grid-cols-3 gap-4 p-4 text-sm"
                    >
                      <div className="font-medium text-foreground">
                        {group.group_name || `Group ${groupId}`}
                      </div>
                      <div className="text-muted-foreground">
                        {isLoadingGroup ? (
                          <Loader2 className="h-4 w-4 animate-spin inline" />
                        ) : (
                          stats.isCounted ? "Yes" : "No"
                        )}
                      </div>
                      <div className="text-muted-foreground">
                        {isLoadingGroup ? "-" : stats.productsNotCounted}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Complete Button - Only visible to Simon */}
            {isSimon && (
              <div className="pb-4">
                <Button
                  onClick={handleCompleteClick}
                  disabled={isExporting || hasLoadingGroups}
                  className="w-full"
                  size="lg"
                  variant="default"
                >
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Complete Stock Count
                </Button>
              </div>
            )}

            {/* Confirmation Dialog */}
            <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                    Confirm Stock Count Completion
                  </DialogTitle>
                  <DialogDescription>
                    Are you sure this will conclude the stock count? This action will export the final CSV file.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setShowConfirmDialog(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => {
                      setShowConfirmDialog(false);
                      handleExportCSV();
                    }}
                    disabled={isExporting}
                  >
                    {isExporting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Exporting...
                      </>
                    ) : (
                      "Yes, Complete"
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        )}

        {!isLoading && !groupsError && sortedGroups.length === 0 && (
          <div className="rounded-lg border border-border bg-white p-6 text-center shadow-md">
            <p className="text-sm text-muted-foreground">
              No groups available at this time.
            </p>
          </div>
        )}
      </div>
    </MobileLayout>
  );
}

export default FinalizeCount;

