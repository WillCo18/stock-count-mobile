import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchProductsByGroup, markGroupComplete } from "@/lib/airtable";
import { ArrowLeft, Loader2, CheckCircle2 } from "lucide-react";
import { ProductRow } from "@/components/ProductRow";
import { toast } from "@/hooks/use-toast";
import { useMemo, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function GroupDetail() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showPartialWarning, setShowPartialWarning] = useState(false);

  const { data: products, isLoading, error, refetch } = useQuery({
    queryKey: ["products", groupId],
    queryFn: () => fetchProductsByGroup(groupId!),
    enabled: !!groupId,
  });

  const productStats = useMemo(() => {
    if (!products || products.length === 0) {
      return {
        total: 0,
        counted: 0,
        partial: 0,
        hasAtLeastOneCount: false,
      };
    }

    let counted = 0;
    let partial = 0;
    let hasAtLeastOneCount = true;

    products.forEach((p) => {
      const hasFront = p.fields.front_count !== null && p.fields.front_count !== undefined;
      const hasBack = p.fields.back_count !== null && p.fields.back_count !== undefined;

      if (hasFront && hasBack) {
        counted++;
      } else if (hasFront || hasBack) {
        partial++;
      } else {
        hasAtLeastOneCount = false;
      }
    });

    return {
      total: products.length,
      counted,
      partial,
      hasAtLeastOneCount: hasAtLeastOneCount && (counted > 0 || partial > 0),
    };
  }, [products]);

  const completeGroupMutation = useMutation({
    mutationFn: () => markGroupComplete(groupId!),
    onSuccess: () => {
      toast({
        title: "Group completed",
        description: `Group ${groupId} has been marked as complete`,
      });
      queryClient.invalidateQueries({ queryKey: ["groups"] });
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
    if (productStats.partial > 0) {
      setShowPartialWarning(true);
    } else {
      completeGroupMutation.mutate();
    }
  };

  const handleConfirmComplete = () => {
    setShowPartialWarning(false);
    completeGroupMutation.mutate();
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Sticky header */}
      <header className="sticky top-0 z-50 border-b border-border bg-card shadow-sm">
        <div className="container mx-auto flex h-16 max-w-2xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/groups")}
              className="shrink-0"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-bold text-foreground">
              Group {groupId}
            </h1>
          </div>

          <Button
            onClick={handleCompleteClick}
            disabled={!productStats.hasAtLeastOneCount || completeGroupMutation.isPending}
            className="gap-2"
          >
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
          {!isLoading && !error && products && products.length > 0 && (
            <div className="mb-3 rounded-lg border border-border bg-muted/30 px-4 py-2">
              <div className="text-sm font-medium text-foreground">
                {productStats.counted} of {productStats.total} products counted
              </div>
              {productStats.partial > 0 && (
                <div className="text-xs text-muted-foreground">
                  {productStats.partial} partially counted
                </div>
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
              <p className="text-sm text-destructive">
                Failed to load products. Please try again.
              </p>
            </div>
          )}

          {!isLoading && !error && products && products.length === 0 && (
            <div className="rounded-lg border border-border bg-card p-6 text-center">
              <p className="text-sm text-muted-foreground">
                No products found in this group.
              </p>
            </div>
          )}

          {!isLoading && !error && products && products.length > 0 && (
            <div className="space-y-3">
              {products.map((product) => (
                <ProductRow
                  key={product.id}
                  product={product}
                  onSaveSuccess={() => refetch()}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      <AlertDialog open={showPartialWarning} onOpenChange={setShowPartialWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Some products are partially counted</AlertDialogTitle>
            <AlertDialogDescription>
              {productStats.partial} {productStats.partial === 1 ? "product is" : "products are"} partially counted (front or back only). Are you sure you want to complete this group?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmComplete}>
              Complete Anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
