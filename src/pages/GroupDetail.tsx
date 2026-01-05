import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchProductsByGroup, markGroupComplete, fetchAllGroups } from "@/lib/airtable";
import { ArrowLeft, Loader2, CheckCircle2, Search, X, AlertTriangle } from "lucide-react";
import { ProductRow } from "@/components/ProductRow";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function GroupDetail() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [confirmZeros, setConfirmZeros] = useState(false);

  const {
    data: products,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["products", groupId],
    queryFn: () => fetchProductsByGroup(groupId!),
    enabled: !!groupId,
  });

  // Fetch groups to get the group name
  const { data: groups } = useQuery({
    queryKey: ["groups"],
    queryFn: fetchAllGroups, // ✅ CHANGED: Now uses fetchAllGroups instead of fetchActiveGroups
  });

  const groupName = useMemo(() => {
    const group = groups?.find((g) => g.group_number === groupId);
    return group?.group_name || `Group ${groupId}`;
  }, [groups, groupId]);

  const productStats = useMemo(() => {
    if (!products || products.length === 0) {
      return {
        total: 0,
        counted: 0,
        partial: 0,
        uncounted: 0,
      };
    }

    let counted = 0;
    let partial = 0;
    let uncounted = 0;

    products.forEach((p) => {
      const hasFront = p.fields.front_count !== null && p.fields.front_count !== undefined;
      const hasBack = p.fields.back_count !== null && p.fields.back_count !== undefined;

      if (hasFront && hasBack) {
        counted++;
      } else if (hasFront || hasBack) {
        partial++;
      } else {
        uncounted++;
      }
    });

    return {
      total: products.length,
      counted,
      partial,
      uncounted,
    };
  }, [products]);

  // Filter products based on search query
  const filteredProducts = useMemo(() => {
    if (!products) return [];
    if (!searchQuery.trim()) return products;

    const query = searchQuery.toLowerCase();
    return products.filter((p) => {
      const productName = (p.fields?.description || "").toLowerCase();
      const productCode = (p.fields?.unique_id || p.fields?.sage_ref || "").toLowerCase();
      return productName.includes(query) || productCode.includes(query);
    });
  }, [products, searchQuery]);

  const completeGroupMutation = useMutation({
    mutationFn: () => markGroupComplete(groupId!),
    onSuccess: async () => {
      toast({
        title: "Group completed",
        description: `Group ${groupId} has been marked as complete`,
      });
      // Force refetch of all groups to ensure completed status is updated
      await queryClient.invalidateQueries({ queryKey: ["groups"] });
      await queryClient.refetchQueries({ queryKey: ["groups"] });
      navigate("/groups");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to complete group",
        variant: "destructive",
      });
    },
  });

  const handleCompleteClick = () => {
    setConfirmZeros(false); // Reset checkbox when opening modal
    setShowCompletionModal(true);
  };

  const handleConfirmComplete = () => {
    setShowCompletionModal(false);
    completeGroupMutation.mutate();
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Sticky header */}
      <header className="sticky top-0 z-50 border-b border-border bg-card shadow-sm">
        <div className="container mx-auto flex h-16 max-w-2xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/groups")} className="shrink-0">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-bold text-foreground">{groupName}</h1>
          </div>

          <Button onClick={handleCompleteClick} disabled={completeGroupMutation.isPending} className="gap-2">
            {completeGroupMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            Complete
          </Button>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="container mx-auto max-w-2xl p-4">
          {/* Search bar */}
          {!isLoading && !error && products && products.length > 0 && (
            <div className="mb-3 relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search products…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-9"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          )}

          {!isLoading && !error && products && products.length > 0 && (
            <div className="mb-3 rounded-lg border border-border bg-muted/30 px-4 py-2">
              <div className="text-sm font-medium text-foreground">
                {productStats.counted} of {productStats.total} products counted
                {searchQuery && ` • Showing ${filteredProducts.length} results`}
              </div>
              {productStats.partial > 0 && (
                <div className="text-xs text-muted-foreground">{productStats.partial} partially counted</div>
              )}
            </div>
          )}
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
              <p className="text-sm text-destructive">Failed to load products. Please try again.</p>
            </div>
          )}

          {!isLoading && !error && products && products.length === 0 && (
            <div className="rounded-lg border border-border bg-card p-6 text-center">
              <p className="text-sm text-muted-foreground">No products found in this group.</p>
            </div>
          )}

          {!isLoading && !error && products && products.length > 0 && filteredProducts.length === 0 && (
            <div className="rounded-lg border border-border bg-card p-6 text-center">
              <p className="text-sm text-muted-foreground">No products match your search.</p>
            </div>
          )}

          {!isLoading && !error && filteredProducts && filteredProducts.length > 0 && (
            <div className="rounded-lg border border-border bg-card overflow-hidden">
              {filteredProducts.map((product) => (
                <ProductRow key={product.id} product={product} onSaveSuccess={() => refetch()} />
              ))}
            </div>
          )}
        </div>
      </main>

      <Dialog open={showCompletionModal} onOpenChange={setShowCompletionModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete Group?</DialogTitle>
            <DialogDescription>Review the count status before completing this group.</DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Uncounted products:</span>
              <span className="font-semibold">{productStats.uncounted}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Partial counts:</span>
              <span className="font-semibold">{productStats.partial}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Fully counted:</span>
              <span className="font-semibold">{productStats.counted}</span>
            </div>

            {(productStats.uncounted > 0 || productStats.partial > 0) && (
              <div className="pt-3 border-t space-y-3">
                <div className="flex items-start gap-2 text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                  <p className="text-sm">
                    {productStats.uncounted > 0 && `${productStats.uncounted} uncounted product(s) will be recorded as zero stock.`}
                    {productStats.uncounted > 0 && productStats.partial > 0 && " "}
                    {productStats.partial > 0 && `${productStats.partial} product(s) have partial counts.`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="confirm-zeros"
                    checked={confirmZeros}
                    onCheckedChange={(checked) => setConfirmZeros(checked === true)}
                  />
                  <label htmlFor="confirm-zeros" className="text-sm font-medium cursor-pointer">
                    I confirm these counts are correct
                  </label>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCompletionModal(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleConfirmComplete} 
              disabled={completeGroupMutation.isPending || ((productStats.uncounted > 0 || productStats.partial > 0) && !confirmZeros)}
            >
              {completeGroupMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Complete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
