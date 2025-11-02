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
    // Support both Unix and Windows newlines and ignore empty lines
    const lines = text.split(/\r?\n/).filter(line => line.trim());
    
    if (lines.length < 2) {
      throw new Error("File must contain at least a header row and one data row");
    }

    // Parse header to find column indices
    const headersLine = lines[0].replace(/^\uFEFF/, "");
    const headers = headersLine.split(",").map(h => h.trim().toLowerCase().replace(/"/g, ""));
    
    const getColumnIndex = (possibleNames: string[]) => {
      for (const name of possibleNames) {
        const index = headers.findIndex(h => h.includes(name.toLowerCase()));
        if (index !== -1) return index;
      }
      return -1;
    };

    const firstNameIdx = getColumnIndex(["first name", "first_name", "firstname", "given name", "given_name"]);
    const lastNameIdx = getColumnIndex(["last name", "last_name", "lastname", "surname", "family name", "family_name"]);
    const studentNameIdx = getColumnIndex(["student name", "student_name", "studentname", "name"]);
    const classNameIdx = getColumnIndex(["class name", "class_name", "classname", "class"]);
    const totalFeeIdx = getColumnIndex(["total fee", "total_fee", "totalfee", "fee"]);
    const feePaidIdx = getColumnIndex(["fee paid", "fee_paid", "feepaid", "paid", "status"]);
    const monthIdx = getColumnIndex(["month"]);
    const yearIdx = getColumnIndex(["year"]);

    console.log("Column indices:", { firstNameIdx, lastNameIdx, studentNameIdx, classNameIdx, totalFeeIdx, feePaidIdx, monthIdx, yearIdx });

    if ((firstNameIdx === -1 && studentNameIdx === -1) || classNameIdx === -1) {
      throw new Error("Required columns not found. CSV must have either 'First Name' (and optional 'Last Name') with 'Class Name', or 'Student Name' with 'Class Name'.");
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

        const getVal = (idx: number) => (idx !== -1 ? (values[idx] || "") : "");
        const rawFirst = getVal(firstNameIdx);
        const rawLast = getVal(lastNameIdx);
        const rawStudent = getVal(studentNameIdx);
        const className = getVal(classNameIdx);
        const totalFee = totalFeeIdx !== -1 ? Number(getVal(totalFeeIdx)) || 0 : 0;
        const feePaidRaw = feePaidIdx !== -1 ? getVal(feePaidIdx) : "no";
        const monthRaw = monthIdx !== -1 ? getVal(monthIdx) : "";
        const year = yearIdx !== -1 ? Number(getVal(yearIdx)) || new Date().getFullYear() : new Date().getFullYear();

        // Derive first/last when only "Student Name" is provided
        let firstName = rawFirst;
        let lastName = rawLast;
        if ((!firstName || !lastName) && rawStudent) {
          const parts = rawStudent.split(" ").filter(Boolean);
          firstName = firstName || parts[0] || "";
          lastName = lastName || parts.slice(1).join(" ");
        }

        // Normalize
        firstName = firstName.trim();
        lastName = (lastName || "").trim();
        const displayName = `${firstName} ${lastName}`.trim();
        const feePaid = feePaidRaw.toLowerCase();
        const monthToken = monthRaw.toLowerCase();

        if (!firstName || !className) {
          results.errors.push(`Row ${i + 1}: Missing first name or class name`);
          results.failed++;
          continue;
        }

        // Convert month to number (supports names, 3-letter abbreviations, or 1-12)
        let monthNumber: number | undefined;
        if (/^\d{1,2}$/.test(monthToken)) {
          monthNumber = Math.max(1, Math.min(12, parseInt(monthToken, 10)));
        } else {
          const abbrevMap: { [key: string]: number } = { jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,sept:9,oct:10,nov:11,dec:12 };
          monthNumber = monthMap[monthToken] || abbrevMap[monthToken];
        }
        if (!monthNumber) {
          results.errors.push(`Row ${i + 1}: Invalid month "${monthRaw}" for student ${displayName}`);
          results.failed++;
          continue;
        }

        // Find the class - try exact match first, then without "Class" prefix
        let { data: classData, error: classError } = await supabase
          .from("classes")
          .select("id")
          .ilike("name", className)
          .maybeSingle();

        // If not found and className starts with "Class ", try without prefix
        if (!classData && className.toLowerCase().startsWith("class ")) {
          const classNameWithoutPrefix = className.substring(6).trim();
          const { data: altClassData } = await supabase
            .from("classes")
            .select("id")
            .ilike("name", classNameWithoutPrefix)
            .maybeSingle();
          classData = altClassData;
        }

        if (classError || !classData) {
          // Get available classes for better error message
          const { data: availableClasses } = await supabase
            .from("classes")
            .select("name")
            .order("name");
          const classNames = availableClasses?.map(c => c.name).join(", ") || "none";
          results.errors.push(`Row ${i + 1}: Class "${className}" not found for student ${displayName}. Available classes: ${classNames}`);
          results.failed++;
          continue;
        }

        // Find the student by name and class
        let studentData: { id: string; total_fee: number } | null = null;
        if (lastName) {
          const { data, error } = await supabase
            .from("students")
            .select("id, total_fee")
            .eq("class_id", classData.id)
            .ilike("first_name", firstName)
            .ilike("last_name", lastName)
            .maybeSingle();
          if (!error && data) studentData = data;
        } else {
          const { data, error } = await supabase
            .from("students")
            .select("id, total_fee")
            .eq("class_id", classData.id)
            .ilike("first_name", firstName);
          if (!error && data && data.length === 1) {
            studentData = data[0];
          } else if (!error && data && data.length > 1) {
            results.errors.push(`Row ${i + 1}: Multiple students named "${firstName}" found in class "${className}". Provide Last Name.`);
            results.failed++;
            continue;
          }
        }

        if (!studentData) {
          results.errors.push(`Row ${i + 1}: Student "${displayName}" not found in class "${className}"`);
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
            console.log(`Updated total fee for ${displayName} to ${totalFee}`);
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
            results.errors.push(`Row ${i + 1}: Failed to update fee record for ${displayName}: ${feeError.message}`);
            results.failed++;
            continue;
          }

          console.log(`Marked fee as paid for ${displayName} - ${monthRaw} ${year}`);
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
