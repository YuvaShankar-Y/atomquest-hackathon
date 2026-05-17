import { useEffect, useState } from "react";
import { format, isSameDay, parseISO, startOfDay, subDays } from "date-fns";
import { Activity, Bot, Boxes, Package } from "lucide-react";
import { ItemsStatusBarChart } from "@/components/charts/BarChart";
import { AICallsLineChart } from "@/components/charts/LineChart";
import { ProviderDistributionPieChart } from "@/components/charts/PieChart";
import { ItemModal } from "@/components/modals/ItemModal";
import { AILogsTable } from "@/components/tables/AILogsTable";
import { ItemsTable } from "@/components/tables/ItemsTable";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { useAILogs, useAllAILogs } from "@/hooks/useAILogs";
import { useAllItems, useCreateItem, useDeleteItem, useItems, useUpdateItem } from "@/hooks/useItems";
import { toast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/lib/api";
import type { AIProviderName, ItemCreate, ItemRead, ItemStatus } from "@/types";

const statusColors: Record<ItemStatus, string> = {
  draft: "hsl(38 92% 50%)",
  active: "hsl(160 84% 39%)",
  archived: "hsl(215 14% 52%)",
};

const providerColors: Record<AIProviderName, string> = {
  mock: "hsl(217 91% 60%)",
  openai: "hsl(160 84% 39%)",
  groq: "hsl(280 70% 60%)",
  anthropic: "hsl(24 95% 53%)",
};

function StatSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-4 rounded-full" />
      </CardHeader>
      <CardContent className="space-y-2">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-4 w-32" />
      </CardContent>
    </Card>
  );
}

export function Dashboard() {
  const { user } = useAuth();
  const [itemsPage, setItemsPage] = useState(1);
  const [logsPage, setLogsPage] = useState(1);
  const [itemStatusFilter, setItemStatusFilter] = useState<ItemStatus | "all">("all");
  const [providerFilter, setProviderFilter] = useState<AIProviderName | "all">("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ItemRead | null>(null);

  const itemsQuery = useItems({
    page: itemsPage,
    page_size: 8,
    status: itemStatusFilter === "all" ? undefined : itemStatusFilter,
  });
  const allItemsQuery = useAllItems();
  const logsQuery = useAILogs({
    page: logsPage,
    page_size: 8,
    provider: providerFilter === "all" ? undefined : providerFilter,
  });
  const allLogsQuery = useAllAILogs();

  const createItem = useCreateItem();
  const updateItem = useUpdateItem();
  const deleteItem = useDeleteItem();

  useEffect(() => {
    if (!itemsQuery.error) {
      return;
    }
    toast({
      variant: "destructive",
      title: "Could not load items",
      description: getErrorMessage(itemsQuery.error),
    });
  }, [itemsQuery.error]);

  useEffect(() => {
    if (!allItemsQuery.error) {
      return;
    }
    toast({
      variant: "destructive",
      title: "Could not load dashboard items",
      description: getErrorMessage(allItemsQuery.error),
    });
  }, [allItemsQuery.error]);

  useEffect(() => {
    if (!logsQuery.error) {
      return;
    }
    toast({
      variant: "destructive",
      title: "Could not load AI logs",
      description: getErrorMessage(logsQuery.error),
    });
  }, [logsQuery.error]);

  useEffect(() => {
    if (!allLogsQuery.error) {
      return;
    }
    toast({
      variant: "destructive",
      title: "Could not load AI analytics",
      description: getErrorMessage(allLogsQuery.error),
    });
  }, [allLogsQuery.error]);

  const analyticsItems = allItemsQuery.data?.data ?? [];
  const analyticsLogs = allLogsQuery.data?.data ?? [];
  const totalItems = allItemsQuery.data?.meta.total ?? 0;
  const activeItems = analyticsItems.filter((item) => item.status === "active").length;
  const totalAICalls = allLogsQuery.data?.meta.total ?? 0;
  const averageTokens =
    analyticsLogs.length > 0
      ? Math.round(
          analyticsLogs.reduce((sum, log) => sum + log.prompt_tokens + log.completion_tokens, 0) /
            analyticsLogs.length,
        )
      : 0;

  const lineChartData = Array.from({ length: 7 }, (_, index) => {
    const date = startOfDay(subDays(new Date(), 6 - index));
    return {
      date: format(date, "MMM d"),
      calls: analyticsLogs.filter((log) => isSameDay(parseISO(log.created_at), date)).length,
    };
  });

  const barChartData = (["draft", "active", "archived"] as ItemStatus[]).map((status) => ({
    status,
    count: analyticsItems.filter((item) => item.status === status).length,
    color: statusColors[status],
  }));

  const pieChartData = (["mock", "openai", "groq", "anthropic"] as AIProviderName[]).map((provider) => ({
    name: provider,
    value: analyticsLogs.filter((log) => log.provider === provider).length,
    color: providerColors[provider],
  }));

  const recentItems = [...analyticsItems]
    .sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime())
    .slice(0, 5);

  const isStatsLoading = allItemsQuery.isLoading || allLogsQuery.isLoading;
  const isSaving = createItem.isPending || updateItem.isPending;

  const openCreateModal = () => {
    setEditingItem(null);
    setIsModalOpen(true);
  };

  const openEditModal = (item: ItemRead) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (isSaving) {
      return;
    }
    setIsModalOpen(false);
    setEditingItem(null);
  };

  const handleItemSubmit = async (values: ItemCreate) => {
    if (editingItem) {
      await updateItem.mutateAsync({ itemId: editingItem.id, payload: values });
    } else {
      await createItem.mutateAsync(values);
      setItemsPage(1);
    }
    closeModal();
  };

  const handleDeleteItem = (item: ItemRead) => {
    if (!window.confirm(`Delete "${item.title}"? This cannot be undone.`)) {
      return;
    }
    deleteItem.mutate(item.id);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back, {user?.full_name}. Your dashboard is now driven by live items and AI log data.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {isStatsLoading ? (
          <>
            <StatSkeleton />
            <StatSkeleton />
            <StatSkeleton />
            <StatSkeleton />
          </>
        ) : (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Items</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalItems}</div>
                <p className="text-xs text-muted-foreground">All items from `/api/v1/items`.</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Items</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{activeItems}</div>
                <p className="text-xs text-muted-foreground">Currently marked as active.</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">AI Calls</CardTitle>
                <Bot className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalAICalls}</div>
                <p className="text-xs text-muted-foreground">Tracked in `/api/v1/ai/logs`.</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Tokens / Call</CardTitle>
                <Boxes className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{averageTokens}</div>
                <p className="text-xs text-muted-foreground">Prompt plus completion token average.</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">AI Calls Over Time</CardTitle>
            <CardDescription>Last 7 days of AI usage from your real call history.</CardDescription>
          </CardHeader>
          <CardContent>
            {allLogsQuery.isLoading ? <Skeleton className="h-[280px] w-full" /> : <AICallsLineChart data={lineChartData} />}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Recent Items</CardTitle>
            <CardDescription>Your newest items across all statuses.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {allItemsQuery.isLoading ? (
              Array.from({ length: 5 }, (_, index) => <Skeleton key={index} className="h-14 w-full" />)
            ) : recentItems.length ? (
              recentItems.map((item) => (
                <div key={item.id} className="rounded-lg border p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{item.title}</p>
                      <p className="text-sm text-muted-foreground">{format(new Date(item.created_at), "MMM d, yyyy p")}</p>
                    </div>
                    <span className="rounded-full bg-muted px-2.5 py-1 text-xs capitalize text-muted-foreground">
                      {item.status}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No items yet. Create your first item below.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Items by Status</CardTitle>
            <CardDescription>Distribution of draft, active, and archived items.</CardDescription>
          </CardHeader>
          <CardContent>
            {allItemsQuery.isLoading ? <Skeleton className="h-[280px] w-full" /> : <ItemsStatusBarChart data={barChartData} />}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl">AI Provider Distribution</CardTitle>
            <CardDescription>Provider share across all recorded AI calls.</CardDescription>
          </CardHeader>
          <CardContent>
            {allLogsQuery.isLoading ? (
              <Skeleton className="h-[280px] w-full" />
            ) : (
              <>
                <ProviderDistributionPieChart data={pieChartData} />
                <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                  {pieChartData.map((provider) => (
                    <div key={provider.name} className="flex items-center gap-2 rounded-md border px-3 py-2">
                      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: provider.color }} />
                      <span className="capitalize">{provider.name}</span>
                      <span className="ml-auto text-muted-foreground">{provider.value}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-6">
          <ItemsTable
            data={itemsQuery.data?.data ?? []}
            meta={itemsQuery.data?.meta}
            isLoading={itemsQuery.isLoading}
            statusFilter={itemStatusFilter}
            isDeletingId={deleteItem.isPending ? deleteItem.variables : null}
            onPageChange={setItemsPage}
            onStatusFilterChange={(status) => {
              setItemStatusFilter(status);
              setItemsPage(1);
            }}
            onAddItem={openCreateModal}
            onEditItem={openEditModal}
            onDeleteItem={handleDeleteItem}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <AILogsTable
            data={logsQuery.data?.data ?? []}
            meta={logsQuery.data?.meta}
            isLoading={logsQuery.isLoading}
            providerFilter={providerFilter}
            onPageChange={setLogsPage}
            onProviderFilterChange={(provider) => {
              setProviderFilter(provider);
              setLogsPage(1);
            }}
          />
        </CardContent>
      </Card>

      <ItemModal
        open={isModalOpen}
        item={editingItem}
        isSubmitting={isSaving}
        onClose={closeModal}
        onSubmit={(values) => void handleItemSubmit(values)}
      />
    </div>
  );
}
