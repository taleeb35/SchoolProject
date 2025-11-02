import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get the file from form data
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      throw new Error("No file uploaded");
    }

    console.log("Processing file:", file.name);

    // Read the file as text (CSV format)
    const text = await file.text();
    const lines = text.split("\n").filter(line => line.trim());
    
    if (lines.length < 2) {
      throw new Error("File must contain at least a header row and one data row");
    }

    // Parse header to find column indices
    const headers = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/"/g, ""));
    
    const getColumnIndex = (possibleNames: string[]) => {
      for (const name of possibleNames) {
        const index = headers.findIndex(h => h.includes(name.toLowerCase()));
        if (index !== -1) return index;
      }
      return -1;
    };

    const studentNameIdx = getColumnIndex(["student name", "student_name", "studentname", "name"]);
    const classNameIdx = getColumnIndex(["class name", "class_name", "classname", "class"]);
    const totalFeeIdx = getColumnIndex(["total fee", "total_fee", "totalfee", "fee"]);
    const feePaidIdx = getColumnIndex(["fee paid", "fee_paid", "feepaid", "paid", "status"]);
    const monthIdx = getColumnIndex(["month"]);
    const yearIdx = getColumnIndex(["year"]);

    console.log("Column indices:", { studentNameIdx, classNameIdx, totalFeeIdx, feePaidIdx, monthIdx, yearIdx });

    if (studentNameIdx === -1 || classNameIdx === -1) {
      throw new Error("Required columns not found. CSV must have 'Student Name' and 'Class Name' columns");
    }

    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
    };

    // Month name to number mapping
    const monthMap: { [key: string]: number } = {
      january: 1, february: 2, march: 3, april: 4,
      may: 5, june: 6, july: 7, august: 8,
      september: 9, october: 10, november: 11, december: 12,
    };

    // Process data rows
    for (let i = 1; i < lines.length; i++) {
      try {
        const values = lines[i].split(",").map(v => v.trim().replace(/"/g, ""));
        
        const studentName = values[studentNameIdx] || "";
        const className = values[classNameIdx] || "";
        const totalFee = totalFeeIdx !== -1 ? Number(values[totalFeeIdx]) || 0 : 0;
        const feePaid = feePaidIdx !== -1 ? values[feePaidIdx].toLowerCase() : "no";
        const monthName = monthIdx !== -1 ? values[monthIdx].toLowerCase() : "";
        const year = yearIdx !== -1 ? Number(values[yearIdx]) || new Date().getFullYear() : new Date().getFullYear();

        if (!studentName || !className) {
          results.errors.push(`Row ${i + 1}: Missing student name or class name`);
          results.failed++;
          continue;
        }

        // Convert month name to number
        const monthNumber = monthMap[monthName];
        if (!monthNumber) {
          results.errors.push(`Row ${i + 1}: Invalid month "${monthName}" for student ${studentName}`);
          results.failed++;
          continue;
        }

        // Find the class
        const { data: classData, error: classError } = await supabase
          .from("classes")
          .select("id")
          .ilike("name", className)
          .maybeSingle();

        if (classError || !classData) {
          results.errors.push(`Row ${i + 1}: Class "${className}" not found for student ${studentName}`);
          results.failed++;
          continue;
        }

        // Find the student by name and class
        const nameParts = studentName.split(" ");
        const firstName = nameParts[0];

        const { data: studentData, error: studentError } = await supabase
          .from("students")
          .select("id, total_fee")
          .eq("class_id", classData.id)
          .ilike("first_name", firstName)
          .maybeSingle();

        if (studentError || !studentData) {
          results.errors.push(`Row ${i + 1}: Student "${studentName}" not found in class "${className}"`);
          results.failed++;
          continue;
        }

        // Update student's total fee if provided and different
        if (totalFee > 0 && totalFee !== studentData.total_fee) {
          const { error: updateError } = await supabase
            .from("students")
            .update({ total_fee: totalFee })
            .eq("id", studentData.id);

          if (updateError) {
            console.error("Error updating student fee:", updateError);
          } else {
            console.log(`Updated total fee for ${studentName} to ${totalFee}`);
          }
        }

        // If fee is marked as paid, create/update fee record
        if (feePaid === "yes" || feePaid === "y" || feePaid === "true" || feePaid === "paid" || feePaid === "1") {
          const paymentDate = new Date().toISOString().split('T')[0];
          const feeAmount = totalFee > 0 ? totalFee : studentData.total_fee;
          
          const { error: feeError } = await supabase
            .from("fee_records")
            .upsert({
              student_id: studentData.id,
              month: monthNumber,
              year: year,
              is_paid: true,
              amount: feeAmount,
              payment_date: paymentDate,
            }, {
              onConflict: 'student_id,month,year'
            });

          if (feeError) {
            results.errors.push(`Row ${i + 1}: Failed to update fee record for ${studentName}: ${feeError.message}`);
            results.failed++;
            continue;
          }

          console.log(`Marked fee as paid for ${studentName} - ${monthName} ${year}`);
        }

        results.success++;
      } catch (error: any) {
        console.error(`Error processing row ${i + 1}:`, error);
        results.errors.push(`Row ${i + 1}: ${error.message}`);
        results.failed++;
      }
    }

    console.log("Import completed:", results);

    return new Response(
      JSON.stringify(results),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error("Error in import-fees function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
