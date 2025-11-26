import { useState, useEffect, memo, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Check } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { submitCounts } from "@/lib/airtable";
import { useStaff } from "@/contexts/StaffContext";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { AirtableProduct } from "@/lib/airtable";

interface ProductRowProps {
  product: AirtableProduct;
  onSaveSuccess: () => void;
}

export const ProductRow = memo(({ product, onSaveSuccess }: ProductRowProps) => {
  const { staffName } = useStaff();
  const [frontCount, setFrontCount] = useState<string>(
    product.fields.front_count?.toString() || ""
  );
  const [backCount, setBackCount] = useState<string>(
    product.fields.back_count?.toString() || ""
  );
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setFrontCount(product.fields.front_count?.toString() || "");
    setBackCount(product.fields.back_count?.toString() || "");
  }, [product.fields.front_count, product.fields.back_count]);

  const saveMutation = useMutation({
    mutationFn: submitCounts,
    onSuccess: () => {
      onSaveSuccess();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save counts",
        variant: "destructive",
      });
    },
  });

  const debouncedSave = (front: string, back: string) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      if (!staffName) return;

      const frontValue = front ? parseInt(front) : null;
      const backValue = back ? parseInt(back) : null;
      
      // Only save if there's at least one value
      if (frontValue === null && backValue === null) return;

      // Check if values actually changed
      const currentFront = product.fields.front_count ?? null;
      const currentBack = product.fields.back_count ?? null;
      
      if (frontValue === currentFront && backValue === currentBack) return;

      const isCompleted = front !== "" && back !== "";

      saveMutation.mutate({
        uniqueId: product.fields.unique_id,
        frontCount: frontValue ?? 0,
        backCount: backValue ?? 0,
        userName: staffName,
        sheetCompleted: isCompleted,
      });
    }, 500);
  };

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const handleFrontChange = (value: string) => {
    setFrontCount(value);
    debouncedSave(value, backCount);
  };

  const handleBackChange = (value: string) => {
    setBackCount(value);
    debouncedSave(frontCount, value);
  };

  // Determine product state
  const hasFront = frontCount !== "";
  const hasBack = backCount !== "";
  const isNotCounted = !hasFront && !hasBack;
  const isPartial = (hasFront && !hasBack) || (!hasFront && hasBack);
  const isComplete = hasFront && hasBack;

  const total = (parseInt(frontCount) || 0) + (parseInt(backCount) || 0);

  return (
    <div
      className={`rounded-lg p-3 transition-all ${
        isComplete
          ? "border-2 border-green-600/40 bg-card"
          : isPartial
          ? "border-2 border-amber-500/60 bg-card"
          : "border border-border bg-card"
      }`}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="flex-1 space-y-0.5">
          <div className="text-sm font-semibold text-foreground leading-tight">
            {product.fields.description}
          </div>
          <div className="text-xs text-muted-foreground">PLU: {product.fields.plu}</div>
        </div>
        <div className="flex items-center gap-1.5">
          {isPartial && (
            <Badge variant="outline" className="border-amber-500/60 text-amber-700 dark:text-amber-400 text-xs">
              Partial
            </Badge>
          )}
          {isComplete && (
            <Check className="h-5 w-5 text-green-600 dark:text-green-500" />
          )}
        </div>
      </div>

      <div className="grid grid-cols-[1fr_1fr_auto] items-end gap-3">
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">
            Front
          </label>
          <Input
            type="number"
            inputMode="numeric"
            value={frontCount}
            onChange={(e) => handleFrontChange(e.target.value)}
            className="h-10 text-base"
            placeholder=""
          />
        </div>

        <div>
          <label className="mb-1 block text-xs text-muted-foreground">
            Back
          </label>
          <Input
            type="number"
            inputMode="numeric"
            value={backCount}
            onChange={(e) => handleBackChange(e.target.value)}
            className="h-10 text-base"
            placeholder=""
          />
        </div>

        <div>
          <div className="text-xs text-muted-foreground mb-1">Total</div>
          <div className="text-base font-semibold text-foreground h-10 flex items-center">{total}</div>
        </div>
      </div>
    </div>
  );
});

ProductRow.displayName = "ProductRow";
