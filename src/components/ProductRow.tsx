import { useState, useEffect, memo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Check, Loader2 } from "lucide-react";
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
  const [showSaved, setShowSaved] = useState(false);

  useEffect(() => {
    setFrontCount(product.fields.front_count?.toString() || "");
    setBackCount(product.fields.back_count?.toString() || "");
  }, [product.fields.front_count, product.fields.back_count]);

  const saveMutation = useMutation({
    mutationFn: submitCounts,
    onSuccess: () => {
      setShowSaved(true);
      setTimeout(() => setShowSaved(false), 2000);
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

  const handleSave = () => {
    if (!staffName) return;

    const front = frontCount ? parseInt(frontCount) : 0;
    const back = backCount ? parseInt(backCount) : 0;
    const isCompleted = frontCount !== "" && backCount !== "";

    saveMutation.mutate({
      uniqueId: product.fields.unique_id,
      frontCount: front,
      backCount: back,
      userName: staffName,
      sheetCompleted: isCompleted,
    });
  };

  const total = (parseInt(frontCount) || 0) + (parseInt(backCount) || 0);

  return (
    <div
      className={`rounded-lg border p-4 transition-all ${
        product.fields.sheet_completed
          ? "border-border/50 bg-muted/30 opacity-75"
          : "border-border bg-card"
      }`}
    >
      <div className="mb-3 space-y-1">
        <div className="text-base font-semibold text-foreground">
          {product.fields.description}
        </div>
        <div className="text-sm text-muted-foreground">PLU: {product.fields.plu}</div>
      </div>

      <div className="grid grid-cols-[1fr_1fr_auto_auto] items-center gap-3">
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">
            Front
          </label>
          <Input
            type="number"
            inputMode="numeric"
            value={frontCount}
            onChange={(e) => setFrontCount(e.target.value)}
            className="h-12 text-base"
            placeholder="0"
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
            onChange={(e) => setBackCount(e.target.value)}
            className="h-12 text-base"
            placeholder="0"
          />
        </div>

        <div className="pt-5">
          <div className="text-xs text-muted-foreground">Total</div>
          <div className="text-lg font-semibold text-foreground">{total}</div>
        </div>

        <div className="pt-5">
          <Button
            onClick={handleSave}
            disabled={saveMutation.isPending}
            size="lg"
            className="h-12 w-12 shrink-0"
          >
            {saveMutation.isPending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : showSaved ? (
              <Check className="h-5 w-5 text-green-500" />
            ) : (
              "Save"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
});

ProductRow.displayName = "ProductRow";
