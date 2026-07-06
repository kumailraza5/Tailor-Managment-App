import { useState } from "react";
import { useGetDailyReport, useGetMonthlyReport } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileText, TrendingUp, Users, ShoppingBag, CreditCard } from "lucide-react";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

export default function Reports() {
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
  const [reportMonth, setReportMonth] = useState(new Date().getMonth() + 1);
  const [reportYear, setReportYear] = useState(new Date().getFullYear());

  const { data: daily, isLoading: dailyLoading } = useGetDailyReport({ date: reportDate });
  const { data: monthly, isLoading: monthlyLoading } = useGetMonthlyReport({ month: reportMonth, year: reportYear });

  const monthlyStatusData = monthly?.ordersByStatus ? [
    { name: 'Pending', value: monthly.ordersByStatus.pending || 0, color: '#f59e0b' },
    { name: 'In Stitching', value: monthly.ordersByStatus.in_stitching || 0, color: '#3b82f6' },
    { name: 'Ready', value: monthly.ordersByStatus.ready || 0, color: '#10b981' },
    { name: 'Delivered', value: monthly.ordersByStatus.delivered || 0, color: '#6b7280' },
  ].filter(item => item.value > 0) : [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Reports</h2>
        <p className="text-muted-foreground mt-1">View shop performance and financial metrics.</p>
      </div>

      <Tabs defaultValue="daily" className="w-full">
        <TabsList className="grid w-[400px] grid-cols-2 bg-muted">
          <TabsTrigger value="daily">Daily Report</TabsTrigger>
          <TabsTrigger value="monthly">Monthly Report</TabsTrigger>
        </TabsList>

        <TabsContent value="daily" className="space-y-4 pt-4">
          <Card className="bg-sidebar border-sidebar-border">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <Label htmlFor="date">Select Date</Label>
                <Input 
                  id="date" 
                  type="date" 
                  value={reportDate}
                  onChange={(e) => setReportDate(e.target.value)}
                  className="w-[200px]"
                />
              </div>
            </CardContent>
          </Card>

          {dailyLoading ? (
            <div className="grid gap-4 md:grid-cols-4">
              {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 w-full" />)}
            </div>
          ) : daily ? (
            <>
              <div className="grid gap-4 md:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">New Orders</CardTitle>
                    <ShoppingBag className="h-4 w-4 text-primary" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{daily.newOrders}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Delivered</CardTitle>
                    <TrendingUp className="h-4 w-4 text-green-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{daily.deliveredOrders}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Collection</CardTitle>
                    <CreditCard className="h-4 w-4 text-primary" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">Rs. {parseFloat(String(daily.totalCollection)).toLocaleString()}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">New Customers</CardTitle>
                    <Users className="h-4 w-4 text-blue-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{daily.newCustomers}</div>
                  </CardContent>
                </Card>
              </div>
            </>
          ) : (
            <div className="text-center py-12">Failed to load daily report</div>
          )}
        </TabsContent>

        <TabsContent value="monthly" className="space-y-4 pt-4">
          <Card className="bg-sidebar border-sidebar-border">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Label htmlFor="month">Month</Label>
                  <select 
                    id="month" 
                    value={reportMonth}
                    onChange={(e) => setReportMonth(parseInt(e.target.value))}
                    className="flex h-10 w-[150px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => (
                      <option key={m} value={m}>{format(new Date(2000, m - 1, 1), 'MMMM')}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="year">Year</Label>
                  <Input 
                    id="year" 
                    type="number" 
                    value={reportYear}
                    onChange={(e) => setReportYear(parseInt(e.target.value))}
                    className="w-[100px]"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {monthlyLoading ? (
            <div className="grid gap-4 md:grid-cols-4">
              {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 w-full" />)}
            </div>
          ) : monthly ? (
            <>
              <div className="grid gap-4 md:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                    <ShoppingBag className="h-4 w-4 text-primary" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{monthly.totalOrders}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Revenue</CardTitle>
                    <TrendingUp className="h-4 w-4 text-primary" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">Rs. {parseFloat(String(monthly.totalRevenue)).toLocaleString()}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Collected</CardTitle>
                    <CreditCard className="h-4 w-4 text-green-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">Rs. {parseFloat(String(monthly.totalCollected)).toLocaleString()}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Pending Balance</CardTitle>
                    <FileText className="h-4 w-4 text-destructive" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">Rs. {parseFloat(String(monthly.totalBalance)).toLocaleString()}</div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Order Status Distribution</CardTitle>
                  </CardHeader>
                  <CardContent className="h-[300px] flex items-center justify-center">
                    {monthlyStatusData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={monthlyStatusData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            paddingAngle={5}
                            dataKey="value"
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          >
                            {monthlyStatusData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <RechartsTooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="text-muted-foreground">No order data for this month</div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </>
          ) : (
            <div className="text-center py-12">Failed to load monthly report</div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}