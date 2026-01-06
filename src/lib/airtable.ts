/**
 * Airtable API Data Layer
 * Provides typed helpers for stock counting operations
 */

export interface AirtableProduct {
  id: string;
  fields: {
    sage_ref: string;
    plu: string;
    description: string;
    group_number: string;
    front_count?: number;
    back_count?: number;
    total_count?: number; // Formula field in Airtable
    sheet_completed?: boolean;
    last_updated_by?: string;
    active_this_month?: boolean;
    unique_id: string;
  };
}

export interface AirtableGroup {
  group_number: string;
  group_name: string;
  completed: boolean;
}

export interface CountSubmission {
  uniqueId: string;
  frontCount: number;
  backCount: number;
  userName: string;
  sheetCompleted: boolean;
}

export interface AirtableUser {
  id: string;
  user_id: number;
  name: string;
  role: "Staff" | "Admin";
  is_active: boolean;
  created_date?: string;
  last_used_date?: string;
}

/**
 * Base Airtable configuration
 * Uses Lovable Cloud edge function to securely access API credentials
 */
import { supabase } from "@/integrations/supabase/client";

/**
 * Fetch only active groups (legacy behaviour)
 * Not used for dashboard now, but kept for compatibility.
 */
export async function fetchActiveGroups(): Promise<AirtableGroup[]> {
  try {
    const { data, error } = await supabase.functions.invoke("airtable/groups", {
      method: "GET",
    });

    if (error) {
      throw new Error(`Failed to fetch groups: ${error.message}`);
    }

    return data?.groups || [];
  } catch (error) {
    console.error("Error fetching active groups:", error);
    throw error;
  }
}

/**
 * NEW — Fetch ALL groups, completed or not.
 * This is required so the dashboard never hides completed groups.
 */
export async function fetchAllGroups(): Promise<AirtableGroup[]> {
  try {
    const { data, error } = await supabase.functions.invoke("airtable/groups", {
      method: "GET",
    });

    if (error) {
      throw new Error(`Failed to fetch groups: ${error.message}`);
    }

    // This returns ALL groups because the Edge Function was updated
    return data?.groups || [];
  } catch (error) {
    console.error("Error fetching all groups:", error);
    throw error;
  }
}

/**
 * Fetch all products for a specific group
 * @param groupNumber - The group identifier
 */
export async function fetchProductsByGroup(groupNumber: string): Promise<AirtableProduct[]> {
  try {
    const { data, error } = await supabase.functions.invoke(
      `airtable/products?group=${encodeURIComponent(groupNumber)}`,
      {
        method: "GET",
      },
    );

    if (error) {
      throw new Error(`Failed to fetch products: ${error.message}`);
    }

    return data?.products || [];
  } catch (error) {
    console.error("Error fetching products for group:", error);
    throw error;
  }
}

/**
 * Submit count data for a product
 * @param counts - Count submission data
 */
export async function submitCounts(counts: CountSubmission): Promise<{ success: boolean; recordId?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke("airtable/submit-count", {
      method: "POST",
      body: counts,
    });

    if (error) {
      throw new Error(`Failed to submit counts: ${error.message}`);
    }

    return data;
  } catch (error) {
    console.error("Error submitting counts:", error);
    throw error;
  }
}

/**
 * Mark a counting group as complete
 * @param groupNumber - The group to mark complete
 */
export async function markGroupComplete(groupNumber: string): Promise<{ success: boolean }> {
  try {
    const { data, error } = await supabase.functions.invoke("airtable/complete-group", {
      method: "POST",
      body: { groupNumber },
    });

    if (error) {
      throw new Error(`Failed to mark group complete: ${error.message}`);
    }

    return data;
  } catch (error) {
    console.error("Error marking group complete:", error);
    throw error;
  }
}

/**
 * Fetch all users from the Users table
 */
export async function fetchUsers(): Promise<AirtableUser[]> {
  try {
    const { data, error } = await supabase.functions.invoke("airtable/users", {
      method: "GET",
    });

    if (error) {
      throw new Error(`Failed to fetch users: ${error.message}`);
    }

    return data?.users || [];
  } catch (error) {
    console.error("Error fetching users:", error);
    throw error;
  }
}

/**
 * Create a new user
 * @param name - User's name
 * @param role - User's role (Staff or Admin)
 */
export async function addUser(name: string, role: "Staff" | "Admin" = "Staff"): Promise<{ success: boolean; user?: AirtableUser }> {
  try {
    const { data, error } = await supabase.functions.invoke("airtable/add-user", {
      method: "POST",
      body: { name, role },
    });

    if (error) {
      throw new Error(`Failed to add user: ${error.message}`);
    }

    return data;
  } catch (error) {
    console.error("Error adding user:", error);
    throw error;
  }
}

/**
 * Update an existing user
 * @param user_id - The Airtable user_id (auto number)
 * @param updates - Object with fields to update
 */
export async function updateUser(
  user_id: number,
  updates: Partial<Pick<AirtableUser, "name" | "role" | "is_active" | "last_used_date">>
): Promise<{ success: boolean; user?: AirtableUser }> {
  try {
    const { data, error } = await supabase.functions.invoke("airtable/update-user", {
      method: "POST",
      body: { user_id, updates },
    });

    if (error) {
      throw new Error(`Failed to update user: ${error.message}`);
    }

    return data;
  } catch (error) {
    console.error("Error updating user:", error);
    throw error;
  }
}
