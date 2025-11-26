import { useState, useEffect, memo, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Check, Circle } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { submitCounts } from "@/lib/airtable";
import { useStaff } from "@/contexts/StaffContext";
import { toast } from "@/hooks/use-toast";
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
    <div className="border-b border-border py-2 px-3 transition-colors hover:bg-muted/20">
      <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
        {/* Product name - left side */}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-foreground truncate">
            {product.fields.description}
          </div>
        </div>

        {/* Inputs and status - right side */}
        <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
          <div className="flex items-center gap-1.5">
            <label className="text-xs text-muted-foreground whitespace-nowrap hidden sm:inline">
              Front
            </label>
            <Input
              type="number"
              inputMode="numeric"
              value={frontCount}
              onChange={(e) => handleFrontChange(e.target.value)}
              className="h-11 w-16 sm:w-20 text-sm px-2"
              placeholder=""
              aria-label="Front count"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <label className="text-xs text-muted-foreground whitespace-nowrap hidden sm:inline">
              Back
            </label>
            <Input
              type="number"
              inputMode="numeric"
              value={backCount}
              onChange={(e) => handleBackChange(e.target.value)}
              className="h-11 w-16 sm:w-20 text-sm px-2"
              placeholder=""
              aria-label="Back count"
            />
          </div>

          <div className="flex items-center gap-1.5 min-w-[3rem]">
            <span className="text-xs text-muted-foreground hidden md:inline">Total</span>
            <span className="text-sm font-semibold text-foreground">{total}</span>
          </div>

          <div className="w-5 flex items-center justify-center">
            {isComplete ? (
              <Check className="h-5 w-5 text-green-600 dark:text-green-500" />
            ) : isPartial ? (
              <Circle className="h-4 w-4 fill-amber-500 text-amber-500" />
            ) : (
              <Circle className="h-4 w-4 text-muted-foreground/40" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

ProductRow.displayName = "ProductRow";
