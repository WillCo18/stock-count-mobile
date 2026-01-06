import { useNavigate } from "react-router-dom";
import { useStaff } from "@/contexts/StaffContext";
import { Card } from "@/components/ui/card";
import { fetchUsers, AirtableUser } from "@/lib/airtable";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

export default function StaffSelection() {
  const navigate = useNavigate();
  const { setStaff } = useStaff();
  const [users, setUsers] = useState<AirtableUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const fetchedUsers = await fetchUsers();
        // Filter to only show active users
        const activeUsers = fetchedUsers.filter(u => u.is_active !== false);
        setUsers(activeUsers);
      } catch (err) {
        console.error("Failed to fetch users:", err);
        setError("Failed to load staff list");
      } finally {
        setLoading(false);
      }
    };
    loadUsers();
  }, []);

  const handleSelectStaff = (user: AirtableUser) => {
    console.log("Selecting staff:", user);
    try {
      setStaff(user.name, user.role, user.user_id ?? 0);
      console.log("Staff set successfully, navigating to /groups");
      navigate("/groups");
    } catch (err) {
      console.error("Error setting staff:", err);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-border bg-card shadow-sm">
        <div className="flex h-14 items-center justify-center px-4">
          <h1 className="text-lg font-bold text-foreground">Stock Counter</h1>
        </div>
      </header>

      <main className="flex-1 overflow-auto">
        <div className="container mx-auto max-w-2xl p-4">
          <div className="mb-6 text-center">
            <h2 className="mb-2 text-2xl font-bold text-foreground">Select Your Name</h2>
            <p className="text-muted-foreground">Tap your name to begin counting</p>
          </div>

          <Card className="overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : error ? (
              <div className="py-8 text-center text-destructive">{error}</div>
            ) : users.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">No staff members found</div>
            ) : (
              <div className="divide-y divide-border">
                {users.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => handleSelectStaff(user)}
                    className="w-full px-6 py-4 text-left text-base font-medium text-foreground transition-colors hover:bg-accent focus:bg-accent focus:outline-none active:bg-accent/80 md:px-8 md:py-5 md:text-lg"
                  >
                    {user.name}
                  </button>
                ))}
              </div>
            )}
          </Card>
        </div>
      </main>
    </div>
  );
}
