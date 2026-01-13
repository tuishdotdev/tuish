// OpenNext config for Cloudflare deployment
import { defineCloudflareConfig } from "@opennextjs/cloudflare/config";

export default defineCloudflareConfig({
  // Don't use KV cache to avoid binding requirement
});
