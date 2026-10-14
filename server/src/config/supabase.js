const { createClient } = require("@supabase/supabase-js");

const supabaseUrl =
  process.env.SUPABASE_URL || "https://placeholder-url.supabase.co";
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  "placeholder-anon-key";

if (!supabaseUrl || !supabaseKey) {
  console.warn("Supabase credentials missing from .env");
}

const supabase = createClient(supabaseUrl || "", supabaseKey || "");

module.exports = supabase;
