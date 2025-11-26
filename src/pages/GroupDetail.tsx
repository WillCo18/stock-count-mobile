import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchProductsByGroup, markGroupComplete } from "@/lib/airtable";
import { ArrowLeft, Loader2, CheckCircle2 } from "lucide-react";
import { ProductRow } from "@/components/ProductRow";
import { toast } from "@/hooks/use-toast";
import { useMemo } from "react";

export default function GroupDetail() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: products, isLoading, error, refetch } = useQuery({
    queryKey: ["products", groupId],
    queryFn: () => fetchProductsByGroup(groupId!),
    enabled: !!groupId,
  });

  const allProductsCompleted = useMemo(() => {
    if (!products || products.length === 0) return false;
    return products.every(
      (p) =>
        p.fields.sheet_completed ||
        (p.fields.front_count !== null && 
         p.fields.front_count !== undefined && 
         p.fields.back_count !== null && 
         p.fields.back_count !== undefined)
    );
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
            onClick={() => completeGroupMutation.mutate()}
            disabled={!allProductsCompleted || completeGroupMutation.isPending}
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
    </div>
  );
}
