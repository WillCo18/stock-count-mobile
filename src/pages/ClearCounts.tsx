import { MobileLayout } from "@/layouts/MobileLayout";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useQuery } from "@tanstack/react-query";
import { fetchAllGroups } from "@/lib/airtable";
import { Loader2, AlertTriangle } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "@/hooks/use-toast";
import { useStaff } from "@/contexts/StaffContext";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";

function ClearCounts() {
  const { staffName } = useStaff();
  const navigate = useNavigate();
  const isSimon = staffName === "Simon";
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set());
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [clearAll, setClearAll] = useState(false);

  // Redirect if not Simon
  if (!isSimon) {
    navigate("/groups");
    return null;
  }

  // Fetch ALL groups
  const {
    data: groups,
    isLoading: groupsLoading,
    error: groupsError,
  } = useQuery({
    queryKey: ["groups"],
    queryFn: fetchAllGroups,
  });

  // Sort groups alphabetically
  const sortedGroups = useMemo(() => {
    if (!groups) return [];
    return [...groups].sort((a, b) => {
      const nameA = (a.group_name || `Group ${a.group_number}`).toLowerCase();
      const nameB = (b.group_name || `Group ${b.group_number}`).toLowerCase();
      return nameA.localeCompare(nameB);
    });
  }, [groups]);

  const handleToggleGroup = (groupId: string) => {
    setSelectedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedGroups.size === sortedGroups.length) {
      setSelectedGroups(new Set());
    } else {
      setSelectedGroups(new Set(sortedGroups.map((g) => String(g.group_number))));
    }
  };

  const handleClearClick = () => {
    if (selectedGroups.size === 0 && !clearAll) {
      toast({
        title: "No Selection",
        description: "Please select at least one group to clear, or choose 'Clear All'.",
        variant: "destructive",
      });
      return;
    }
    setShowConfirmDialog(true);
  };

  const handleConfirmClear = async () => {
    setIsClearing(true);
    setShowConfirmDialog(false);

    try {
      const groupsToClear = clearAll
        ? sortedGroups.map((g) => String(g.group_number))
        : Array.from(selectedGroups);

      if (groupsToClear.length === 0) {
        toast({
          title: "Error",
          description: "No groups selected to clear",
          variant: "destructive",
        });
        setIsClearing(false);
        return;
      }

      // Clear counts for each group
      let successCount = 0;
      let errorCount = 0;

      for (const groupId of groupsToClear) {
        try {
          const { error } = await supabase.functions.invoke("airtable/clear-counts", {
            method: "POST",
            body: { groupNumber: groupId },
          });

          if (error) {
            console.error(`Failed to clear group ${groupId}:`, error);
            errorCount++;
          } else {
            successCount++;
          }
        } catch (err) {
          console.error(`Error clearing group ${groupId}:`, err);
          errorCount++;
        }
      }

      if (errorCount === 0) {
        toast({
          title: "Success",
          description: `Successfully cleared counts for ${successCount} group(s)`,
        });
        setSelectedGroups(new Set());
        setClearAll(false);
      } else {
        toast({
          title: "Partial Success",
          description: `Cleared ${successCount} group(s), ${errorCount} failed`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error clearing counts:", error);
      toast({
        title: "Error",
        description: "Failed to clear counts",
        variant: "destructive",
      });
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <MobileLayout title="Clear Counts">
      <div className="space-y-6">
        {!isSimon && (
          <div className="rounded-lg border border-destructive bg-destructive/10 p-4 text-center">
            <p className="text-sm text-destructive">
              Access denied. Only Simon can clear counts.
            </p>
          </div>
        )}

        {isSimon && (
          <>
            {groupsLoading && (
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

            {!groupsLoading && !groupsError && sortedGroups.length > 0 && (
              <>
                <div className="rounded-lg border border-border bg-white p-4 shadow-md">
                  <div className="flex items-center space-x-2 mb-4">
                    <Checkbox
                      id="clear-all"
                      checked={clearAll}
                      onCheckedChange={(checked) => setClearAll(checked === true)}
                    />
                    <label
                      htmlFor="clear-all"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Clear All Groups
                    </label>
                  </div>
                  <p className="text-xs text-muted-foreground mb-4">
                    Select individual groups below, or check "Clear All" to clear all groups at once.
                  </p>
                </div>

                <div className="rounded-lg border border-border bg-white shadow-md overflow-hidden">
                  <div className="divide-y divide-border">
                    {sortedGroups.map((group) => {
                      const groupId = String(group.group_number);
                      const isSelected = selectedGroups.has(groupId);

                      return (
                        <div
                          key={groupId}
                          className="flex items-center space-x-3 p-4 hover:bg-muted/50"
                        >
                          <Checkbox
                            id={`group-${groupId}`}
                            checked={isSelected && !clearAll}
                            disabled={clearAll}
                            onCheckedChange={() => handleToggleGroup(groupId)}
                          />
                          <label
                            htmlFor={`group-${groupId}`}
                            className="flex-1 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                          >
                            {group.group_name || `Group ${groupId}`}
                          </label>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex gap-3 pb-4">
                  <Button
                    onClick={handleSelectAll}
                    variant="outline"
                    className="flex-1"
                    disabled={clearAll || isClearing}
                  >
                    {selectedGroups.size === sortedGroups.length ? "Deselect All" : "Select All"}
                  </Button>
                  <Button
                    onClick={handleClearClick}
                    variant="destructive"
                    className="flex-1"
                    disabled={isClearing || (selectedGroups.size === 0 && !clearAll)}
                  >
                    {isClearing ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Clearing...
                      </>
                    ) : (
                      "Clear Selected"
                    )}
                  </Button>
                </div>

                {/* Confirmation Dialog */}
                <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-destructive" />
                        Confirm Clear Counts
                      </DialogTitle>
                      <DialogDescription>
                        {clearAll ? (
                          <>
                            Are you sure you want to clear counts for <strong>ALL</strong> groups? This will set all front_count and back_count values to zero. This action cannot be undone.
                          </>
                        ) : (
                          <>
                            Are you sure you want to clear counts for {selectedGroups.size} selected group(s)? This will set all front_count and back_count values to zero. This action cannot be undone.
                          </>
                        )}
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
                        variant="destructive"
                        onClick={handleConfirmClear}
                        disabled={isClearing}
                      >
                        {isClearing ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            Clearing...
                          </>
                        ) : (
                          "Yes, Clear Counts"
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </>
            )}

            {!groupsLoading && !groupsError && sortedGroups.length === 0 && (
              <div className="rounded-lg border border-border bg-white p-6 text-center shadow-md">
                <p className="text-sm text-muted-foreground">
                  No groups available at this time.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </MobileLayout>
  );
}

export default ClearCounts;

