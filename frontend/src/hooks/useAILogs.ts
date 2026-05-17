import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { AILogListParams, AILogListResponse, AIProviderName } from "@/types";

const AI_LOGS_QUERY_KEY = "ai-logs";
const ALL_LOGS_PAGE_SIZE = 100;

async function fetchAILogs(params: AILogListParams = {}) {
  const { data } = await api.get<AILogListResponse>("/api/v1/ai/logs", { params });
  return data;
}

async function fetchAllAILogs(provider?: AIProviderName) {
  const firstPage = await fetchAILogs({ page: 1, page_size: ALL_LOGS_PAGE_SIZE, provider });
  if (firstPage.meta.total_pages <= 1) {
    return firstPage;
  }

  const remainingPages = await Promise.all(
    Array.from({ length: firstPage.meta.total_pages - 1 }, (_, index) =>
      fetchAILogs({ page: index + 2, page_size: ALL_LOGS_PAGE_SIZE, provider }),
    ),
  );

  return {
    ...firstPage,
    data: [firstPage.data, ...remainingPages.map((page) => page.data)].flat(),
    meta: {
      ...firstPage.meta,
      page: 1,
      page_size: ALL_LOGS_PAGE_SIZE,
    },
  };
}

export function useAILogs(params: AILogListParams) {
  return useQuery({
    queryKey: [AI_LOGS_QUERY_KEY, "list", params],
    queryFn: () => fetchAILogs(params),
    placeholderData: (previousData) => previousData,
  });
}

export function useAllAILogs(provider?: AIProviderName) {
  return useQuery({
    queryKey: [AI_LOGS_QUERY_KEY, "all", provider ?? "all"],
    queryFn: () => fetchAllAILogs(provider),
  });
}

export type AILogsAnalyticsResult = Awaited<ReturnType<typeof fetchAllAILogs>>;
export type AILogsPageResult = Awaited<ReturnType<typeof fetchAILogs>>;
