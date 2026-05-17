import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, getErrorMessage } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import type {
  ApiResponse,
  ItemCreate,
  ItemDeleteResponse,
  ItemListParams,
  ItemListResponse,
  ItemRead,
  ItemResponse,
  ItemStatus,
  ItemUpdate,
} from "@/types";

const ITEMS_QUERY_KEY = "items";
const ALL_ITEMS_PAGE_SIZE = 100;

async function fetchItems(params: ItemListParams = {}) {
  const { data } = await api.get<ItemListResponse>("/api/v1/items", { params });
  return data;
}

async function fetchAllItems(status?: ItemStatus) {
  const firstPage = await fetchItems({ page: 1, page_size: ALL_ITEMS_PAGE_SIZE, status });
  if (firstPage.meta.total_pages <= 1) {
    return firstPage;
  }

  const remainingPages = await Promise.all(
    Array.from({ length: firstPage.meta.total_pages - 1 }, (_, index) =>
      fetchItems({ page: index + 2, page_size: ALL_ITEMS_PAGE_SIZE, status }),
    ),
  );

  return {
    ...firstPage,
    data: [firstPage.data, ...remainingPages.map((page) => page.data)].flat(),
    meta: {
      ...firstPage.meta,
      page: 1,
      page_size: ALL_ITEMS_PAGE_SIZE,
    },
  };
}

export function useItems(params: ItemListParams) {
  return useQuery({
    queryKey: [ITEMS_QUERY_KEY, "list", params],
    queryFn: () => fetchItems(params),
    placeholderData: (previousData) => previousData,
  });
}

export function useAllItems(status?: ItemStatus) {
  return useQuery({
    queryKey: [ITEMS_QUERY_KEY, "all", status ?? "all"],
    queryFn: () => fetchAllItems(status),
  });
}

export function useCreateItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: ItemCreate) => {
      const { data } = await api.post<ItemResponse>("/api/v1/items", payload);
      return data.data;
    },
    onSuccess: () => {
      toast({ title: "Item created", description: "Your new item is now available in the dashboard." });
      void queryClient.invalidateQueries({ queryKey: [ITEMS_QUERY_KEY] });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Could not create item",
        description: getErrorMessage(error),
      });
    },
  });
}

export function useUpdateItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ itemId, payload }: { itemId: string; payload: ItemUpdate }) => {
      const { data } = await api.patch<ItemResponse>(`/api/v1/items/${itemId}`, payload);
      return data.data;
    },
    onSuccess: () => {
      toast({ title: "Item updated", description: "Changes saved successfully." });
      void queryClient.invalidateQueries({ queryKey: [ITEMS_QUERY_KEY] });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Could not update item",
        description: getErrorMessage(error),
      });
    },
  });
}

export function useDeleteItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (itemId: string) => {
      const { data } = await api.delete<ItemDeleteResponse>(`/api/v1/items/${itemId}`);
      return data.data.deleted;
    },
    onSuccess: () => {
      toast({ title: "Item deleted", description: "The item has been removed." });
      void queryClient.invalidateQueries({ queryKey: [ITEMS_QUERY_KEY] });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Could not delete item",
        description: getErrorMessage(error),
      });
    },
  });
}

export type ItemsAnalyticsResult = Awaited<ReturnType<typeof fetchAllItems>>;
export type ItemsPageResult = Awaited<ReturnType<typeof fetchItems>>;
export type ItemMutationResponse = ApiResponse<ItemRead>;
