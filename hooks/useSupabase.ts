import { useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabase";
import type { PostgrestError } from "@supabase/supabase-js";

/**
 * Hook for executing Supabase queries with loading/error state.
 */
export function useSupabaseQuery<T>(
  queryFn: () => Promise<{ data: T | null; error: PostgrestError | null }>,
  deps: unknown[] = [],
) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const execute = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await queryFn();
    if (error) {
      setError(error.message);
    } else {
      setData(data);
    }
    setLoading(false);
  }, deps);

  useEffect(() => {
    execute();
  }, [execute]);

  return { data, error, loading, refetch: execute };
}

export { supabase };
