import { createClient } from "@base44/sdk";
import { appParams } from "@/lib/app-params";

const { appId, token, functionsVersion, appBaseUrl } = appParams;

export const base44 = appId ? createClient({
  appId,
  token,
  functionsVersion,
  appBaseUrl,
}) : null;
