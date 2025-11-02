// supabase/functions/import-fees/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Papa from 'https://esm.sh/papaparse@5.3.0'
import { Database } from '../_shared/types.ts' // Import shared types

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Month name to number mapping
const monthMap: { [key: string]: number } = {
  'january': 1, 'february': 2, 'march': 3, 'april': 4, 'may': 5, 'june': 6,
  'july': 7, 'august': 8, 'september': 9, 'october': 10, 'november': 11, 'december': 12
};

// Main function logic
async function processImport(csvContent: string) {
  // Create Supabase Admin client
  const supabaseAdmin = createClient<Database>(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  // Parse the CSV content
  const { data: rows, errors: parseErrors } = Papa.parse(csvContent, {
    header: true,
    skipEmptyLines: true,
  });

  if (parseErrors.length > 0) {
    throw new Error(`CSV Parsing Error: ${parseErrors[0].message}`);
  }

  let processedCount = 0;
  const errorDetails: string[] = [];

  for (const row of rows) {
    try {
      // 1. Clean and get data from CSV row
      const studentName = (row['Student Name'] || '').trim();
      const className = (row['Class Name'] || '').trim();
      const totalFee = parseFloat(row['Total Fee']);
      const feePaid = (row['Fee Paid'] || '').trim().toLowerCase() === 'yes';
      const monthName = (row['Month'] || '').trim().toLowerCase();
      const year = parseInt(row['Year']);

      if (!studentName || !className || !monthName || !year) {
        throw new Error(`Skipping row. Missing required fields: ${JSON.stringify(row)}`);
      }

      // 2. Convert month name to number
      const month = monthMap[monthName];
      if (!month) {
        throw new Error(`Invalid month name: "${row['Month']}" for student ${studentName}`);
      }

      // 3. Find Class ID from Class Name
      const { data: classData, error: classError } = await supabaseAdmin
        .from('classes')
        .select('id')
        .eq('name', className)
        .single();

      if (classError || !classData) {
        throw new Error(`Class not found: "${className}" for student ${studentName}`);
      }
      const classId = classData.id;

      // 4. Find Student ID (This is the fragile part)
      // Attempt to split "M. Khurram" into "M." and "Khurram"
      const nameParts = studentName.split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      const { data: studentData, error: studentError } = await supabaseAdmin
        .from('students')
        .select('id, total_fee') // Also grab student's default fee
        .eq('first_name', firstName)
        .eq('last_name', lastName)
        .eq('class_id', classId)
        .single();

      if (studentError || !studentData) {
        throw new Error(`Student not found: "${studentName}" in class "${className}" (Attempted: ${firstName} ${lastName})`);
      }
      const studentId = studentData.id;

      // 5. Determine the fee amount
      // Use the amount from the CSV if provided, otherwise fall back to student's default fee
      const amount = (totalFee && totalFee > 0) ? totalFee : studentData.total_fee;

      // 6. Prepare the fee record for upsert
      const feeRecord = {
        student_id: studentId,
        month: month,
        year: year,
        is_paid: feePaid,
        amount: amount,
        payment_date: feePaid ? new Date().toISOString() : null,
      };

      // 7. Upsert the record
      // This will update if a record for this student/month/year exists,
      // or create it if it doesn't.
      const { error: upsertError } = await supabaseAdmin
        .from('fee_records')
        .upsert(feeRecord, { onConflict: 'student_id, month, year' });

      if (upsertError) {
        throw new Error(`Failed to save record for ${studentName}: ${upsertError.message}`);
      }

      processedCount++;
    } catch (err) {
      console.error(err.message);
      errorDetails.push(err.message);
    }
  }

  // 8. Return the result
  return {
    message: `Import complete. ${processedCount} records processed. ${errorDetails.length} errors.`,
    errors: errorDetails,
  };
}

// Serve the function
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { csvContent } = await req.json()
    if (!csvContent) {
      throw new Error("No csvContent provided")
    }

    console.log("Import-fees function invoked, starting processing...");
    const result = await processImport(csvContent);
    console.log("Processing complete.");

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error("Function Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})