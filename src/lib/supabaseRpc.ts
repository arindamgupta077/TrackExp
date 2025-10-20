import type { PostgrestError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export type RpcResponse<T> = {
  data: T | null;
  error: PostgrestError | null;
};

export const callSupabaseRpc = async <T>(
  functionName: string,
  params?: Record<string, unknown>
): Promise<RpcResponse<T>> => {
  return supabase.rpc(functionName as never, params as never) as unknown as Promise<RpcResponse<T>>;
};
