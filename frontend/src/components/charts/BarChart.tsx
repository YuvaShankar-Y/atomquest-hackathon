import {
  Bar,
  BarChart as RechartsBarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useTheme } from "@/contexts/ThemeContext";

interface BarChartDatum {
  status: string;
  count: number;
  color: string;
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}) {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div className="rounded-md border bg-card px-3 py-2 text-sm shadow-md">
      <p className="font-medium capitalize">{label}</p>
      <p className="text-muted-foreground">{payload[0].value} items</p>
    </div>
  );
}

export function ItemsStatusBarChart({ data }: { data: BarChartDatum[] }) {
  const { isDark } = useTheme();

  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RechartsBarChart data={data} margin={{ top: 8, right: 16, left: -24, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "hsl(var(--border))" : "hsl(var(--muted))"} />
          <XAxis dataKey="status" stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
          <YAxis allowDecimals={false} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
          <Tooltip content={<ChartTooltip />} />
          <Bar dataKey="count" radius={[8, 8, 0, 0]}>
            {data.map((entry) => (
              <Cell key={entry.status} fill={entry.color} />
            ))}
          </Bar>
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  );
}
