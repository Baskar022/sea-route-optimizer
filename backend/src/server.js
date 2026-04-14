import app from "./app.js";
import { env, hasSupabaseServiceConfig } from "./config/env.js";

app.listen(env.port, () => {
  const supabaseStatus = hasSupabaseServiceConfig ? "enabled" : "disabled";
  // Keep startup log concise for Codespaces and local dev.
  console.log(`Ship route optimizer backend running on port ${env.port} (supabase: ${supabaseStatus})`);
});
