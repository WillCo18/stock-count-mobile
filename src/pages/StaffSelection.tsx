import { useNavigate } from "react-router-dom";
import { useStaff } from "@/contexts/StaffContext";
import { Card } from "@/components/ui/card";

const STAFF_NAMES = [
  "Alice Thompson",
  "Ben Wilson",
  "Claire Davis",
  "David Martinez",
  "Emma Johnson",
  "Frank Anderson",
  "Grace Lee",
  "Henry Brown",
];

export default function StaffSelection() {
  const navigate = useNavigate();
  const { setStaffName } = useStaff();

  const handleSelectStaff = (name: string) => {
    setStaffName(name);
    navigate("/groups");
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-border bg-card shadow-sm">
        <div className="flex h-14 items-center justify-center px-4">
          <h1 className="text-lg font-bold text-foreground">
            Stock Counter
          </h1>
        </div>
      </header>

      <main className="flex-1 overflow-auto">
        <div className="container mx-auto max-w-2xl p-4">
          <div className="mb-6 text-center">
            <h2 className="mb-2 text-2xl font-bold text-foreground">
              Select Your Name
            </h2>
            <p className="text-muted-foreground">
              Tap your name to begin counting
            </p>
          </div>

          <Card className="overflow-hidden">
            <div className="divide-y divide-border">
              {STAFF_NAMES.map((name) => (
                <button
                  key={name}
                  onClick={() => handleSelectStaff(name)}
                  className="w-full px-6 py-4 text-left text-base font-medium text-foreground transition-colors hover:bg-accent focus:bg-accent focus:outline-none active:bg-accent/80 md:px-8 md:py-5 md:text-lg"
                >
                  {name}
                </button>
              ))}
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}
