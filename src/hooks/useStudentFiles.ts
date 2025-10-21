import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { FileInfo, StudentFilesResponse } from '@/lib/interfaces';

/**
 * Fetch student files from API
 */
async function fetchStudentFiles(
  studentId: string, 
  limit?: number, 
  offset?: number, 
  forceRefresh?: boolean
): Promise<StudentFilesResponse> {
  const params = new URLSearchParams();
  if (limit) params.set('limit', limit.toString());
  if (offset) params.set('offset', offset.toString());
  if (forceRefresh) params.set('refresh', 'true');

  const response = await fetch(`/api/students/${studentId}/files?${params}`);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch files: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Hook for fetching student files with React Query
 */
export function useStudentFiles(
  studentId: string,
  options?: {
    limit?: number;
    offset?: number;
    enabled?: boolean;
  }
) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['student-files', studentId, options?.limit, options?.offset],
    queryFn: () => fetchStudentFiles(studentId, options?.limit, options?.offset),
    enabled: options?.enabled !== false && !!studentId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    retry: 2,
    refetchOnWindowFocus: false,
  });

  // Mutation for refreshing files
  const refreshMutation = useMutation({
    mutationFn: () => fetchStudentFiles(studentId, options?.limit, options?.offset, true),
    onSuccess: (data) => {
      // Update the cache with fresh data
      queryClient.setQueryData(
        ['student-files', studentId, options?.limit, options?.offset],
        data
      );
    },
  });

  // Mutation for loading more files
  const loadMoreMutation = useMutation({
    mutationFn: (offset: number) => fetchStudentFiles(studentId, options?.limit, offset),
    onSuccess: (newData, offset) => {
      // Append new files to existing cache
      queryClient.setQueryData(
        ['student-files', studentId, options?.limit, offset],
        (oldData: StudentFilesResponse | undefined) => {
          if (!oldData) return newData;
          
          return {
            ...newData,
            files: [...oldData.files, ...newData.files],
            count: oldData.files.length + newData.files.length,
          };
        }
      );
    },
  });

  return {
    // Query data
    files: query.data?.files || [],
    totalCount: query.data?.totalCount || 0,
    hasMore: query.data?.hasMore || false,
    fromCache: query.data?.fromCache,
    cacheFresh: query.data?.cacheFresh,
    
    // Query state
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    isFetching: query.isFetching,
    
    // Actions
    refetch: query.refetch,
    refresh: refreshMutation.mutate,
    loadMore: loadMoreMutation.mutate,
    
    // Mutation states
    isRefreshing: refreshMutation.isPending,
    isLoadingMore: loadMoreMutation.isPending,
  };
}

/**
 * Hook for fetching all student files (no pagination)
 */
export function useAllStudentFiles(studentId: string) {
  return useStudentFiles(studentId, {
    enabled: !!studentId,
  });
}

/**
 * Hook for fetching recent student files (first 3)
 */
export function useRecentStudentFiles(studentId: string) {
  return useStudentFiles(studentId, {
    limit: 3,
    enabled: !!studentId,
  });
}
