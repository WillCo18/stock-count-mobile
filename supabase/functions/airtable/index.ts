import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Airtable Edge Function
 * Securely handles all Airtable API operations
 */
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = url.pathname.split("/").pop();

    const AIRTABLE_API_KEY = Deno.env.get("AIRTABLE_API_KEY");
    const AIRTABLE_BASE_ID = Deno.env.get("AIRTABLE_BASE_ID");

    if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
      console.error("Missing Airtable credentials");
      throw new Error("Airtable credentials not configured");
    }

    const airtableHeaders = {
      Authorization: `Bearer ${AIRTABLE_API_KEY}`,
      "Content-Type": "application/json",
    };

    const baseUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}`;

    // Route handling
    switch (path) {
      /**
       * GET /groups
       * Fetch ALL groups (completed + incomplete)
       */
      case "groups": {
        console.log("Fetching all groups from Airtable");

        const response = await fetch(`${baseUrl}/Groups`, {
          headers: airtableHeaders,
        });

        if (!response.ok) {
          throw new Error(`Airtable API error: ${response.statusText}`);
        }

        const data = await response.json();
        console.log(`Retrieved ${data.records?.length || 0} groups`);

        // Transform Airtable records to simplified format
        const groups =
          data.records?.map((record: any) => ({
            group_number: record.fields.group_number,
            group_name: record.fields.group_name,
            completed: record.fields.completed || false,
          })) || [];

        return new Response(JSON.stringify({ groups }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      /**
       * GET /products?group=XX
       * Fetches all products for a group, handling pagination
       */
      case "products": {
        const groupNumber = url.searchParams.get("group");

        if (!groupNumber) {
          throw new Error("Group number is required");
        }

        console.log(`Fetching products for group: ${groupNumber}`);

        let allProducts: any[] = [];
        let offset: string | null = null;
        let pageCount = 0;

        // Fetch all pages of results
        do {
          let requestUrl = `${baseUrl}/Products?filterByFormula={group_number}='${groupNumber}'&pageSize=100`;
          if (offset) {
            requestUrl += `&offset=${offset}`;
          }

          const response = await fetch(requestUrl, {
            headers: airtableHeaders,
          });

          if (!response.ok) {
            throw new Error(`Airtable API error: ${response.statusText}`);
          }

          const data = await response.json();
          const records = data.records || [];
          
          allProducts = allProducts.concat(
            records.map((record: any) => ({
              id: record.id,
              fields: record.fields,
            }))
          );

          offset = data.offset || null;
          pageCount++;
          
          console.log(`Retrieved page ${pageCount}: ${records.length} products (total so far: ${allProducts.length})`);
        } while (offset);

        console.log(`Retrieved ${allProducts.length} total products for group ${groupNumber}`);

        return new Response(JSON.stringify({ products: allProducts }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      /**
       * POST /submit-count
       */
      case "submit-count": {
        if (req.method !== "POST") throw new Error("POST method required");

        const body = await req.json();
        const { uniqueId, frontCount, backCount, userName, sheetCompleted } = body;

        console.log(`Submitting count for product ${uniqueId} by ${userName}`);

        const findResponse = await fetch(`${baseUrl}/Products?filterByFormula={unique_id}='${uniqueId}'`, {
          headers: airtableHeaders,
        });

        if (!findResponse.ok) {
          throw new Error(`Failed to find product: ${findResponse.statusText}`);
        }

        const findData = await findResponse.json();
        if (!findData.records || findData.records.length === 0) {
          throw new Error(`Product ${uniqueId} not found`);
        }

        const recordId = findData.records[0].id;

        const response = await fetch(`${baseUrl}/Products/${recordId}`, {
          method: "PATCH",
          headers: airtableHeaders,
          body: JSON.stringify({
            fields: {
              front_count: frontCount,
              back_count: backCount,
              last_updated_by: userName,
              sheet_completed: sheetCompleted,
            },
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error("Airtable submission error:", errorText);
          throw new Error(`Failed to submit count: ${response.statusText}`);
        }

        const data = await response.json();
        console.log(`Count submitted successfully, record ID: ${data.id}`);

        return new Response(JSON.stringify({ success: true, recordId: data.id }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      /**
       * POST /complete-group
       */
      case "complete-group": {
        if (req.method !== "POST") throw new Error("POST method required");

        const body = await req.json();
        const { groupNumber } = body;

        console.log(`Marking group ${groupNumber} as complete`);

        const findResponse = await fetch(`${baseUrl}/Groups?filterByFormula={group_number}='${groupNumber}'`, {
          headers: airtableHeaders,
        });

        if (!findResponse.ok) {
          throw new Error(`Failed to find group: ${findResponse.statusText}`);
        }

        const findData = await findResponse.json();
        if (!findData.records || findData.records.length === 0) {
          throw new Error(`Group ${groupNumber} not found`);
        }

        const recordId = findData.records[0].id;

        const updateResponse = await fetch(`${baseUrl}/Groups/${recordId}`, {
          method: "PATCH",
          headers: airtableHeaders,
          body: JSON.stringify({
            fields: {
              completed: true,
            },
          }),
        });

        if (!updateResponse.ok) {
          const errorText = await updateResponse.text();
          console.error("Failed to update group status:", errorText);
          throw new Error(`Failed to mark group complete: ${updateResponse.statusText}`);
        }

        console.log(`Group ${groupNumber} marked as complete`);

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      /**
       * POST /clear-counts
       * Clear all counts (front_count and back_count) for products in a group
       */
      case "clear-counts": {
        if (req.method !== "POST") throw new Error("POST method required");

        const body = await req.json();
        const { groupNumber } = body;

        if (!groupNumber) {
          throw new Error("Group number is required");
        }

        console.log(`Clearing counts for group: ${groupNumber}`);

        // First, fetch all products for this group (with pagination)
        let allProductRecords: any[] = [];
        let offset: string | null = null;

        do {
          let requestUrl = `${baseUrl}/Products?filterByFormula={group_number}='${groupNumber}'&pageSize=100`;
          if (offset) {
            requestUrl += `&offset=${offset}`;
          }

          const fetchResponse = await fetch(requestUrl, {
            headers: airtableHeaders,
          });

          if (!fetchResponse.ok) {
            throw new Error(`Failed to fetch products: ${fetchResponse.statusText}`);
          }

          const fetchData = await fetchResponse.json();
          allProductRecords = allProductRecords.concat(fetchData.records || []);
          offset = fetchData.offset || null;
        } while (offset);

        console.log(`Found ${allProductRecords.length} products to clear for group ${groupNumber}`);

        // Update all products to set counts to 0
        // Airtable allows batch updates of up to 10 records at a time
        const batchSize = 10;
        let successCount = 0;
        let errorCount = 0;

        for (let i = 0; i < allProductRecords.length; i += batchSize) {
          const batch = allProductRecords.slice(i, i + batchSize);
          
          const updates = batch.map((record: any) => ({
            id: record.id,
            fields: {
              front_count: 0,
              back_count: 0,
            },
          }));

          const updateResponse = await fetch(`${baseUrl}/Products`, {
            method: "PATCH",
            headers: {
              ...airtableHeaders,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              records: updates,
            }),
          });

          if (!updateResponse.ok) {
            const errorText = await updateResponse.text();
            console.error(`Failed to update batch: ${errorText}`);
            errorCount += batch.length;
          } else {
            successCount += batch.length;
          }
        }

        console.log(`Cleared counts: ${successCount} succeeded, ${errorCount} failed`);

        return new Response(
          JSON.stringify({
            success: errorCount === 0,
            cleared: successCount,
            failed: errorCount,
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      default:
        throw new Error("Invalid endpoint");
    }
  } catch (error) {
    console.error("Error in airtable function:", error);

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error occurred",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
