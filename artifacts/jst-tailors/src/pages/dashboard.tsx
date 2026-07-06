import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useGetDashboardStats, useGetDashboardRecentOrders, useGetDashboardTodayDeliveries, useListCustomers, getListCustomersQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Scissors, ShoppingBag, CreditCard, Package, Search, Plus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const { data: stats, isLoading: statsLoading } = useGetDashboardStats();
  const { data: recentOrders, isLoading: ordersLoading } = useGetDashboardRecentOrders({ limit: 5 });
  const { data: todayDeliveries, isLoading: deliveriesLoading } = useGetDashboardTodayDeliveries();
  const { data: searchResults, isLoading: searchLoading } = useListCustomers(
    { search: debouncedSearch },
    { query: { enabled: debouncedSearch.length > 0, queryKey: getListCustomersQueryKey({ search: debouncedSearch }) } }
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300";
      case "in_stitching": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
      case "ready": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "delivered": return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusLabel = (status: string) => {
    return status.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground mt-1">Overview of your shop's performance.</p>
      </div>

      {/* 🔍 Customer Search Bar */}
      <Card className="border-sidebar-border shadow-sm">
        <CardContent className="pt-6">
          <div className="flex items-center space-x-2 bg-sidebar border border-sidebar-border rounded-lg px-3 py-1 max-w-xl">
            <Search className="w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search customer to start measurements or add order..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="border-0 shadow-none focus-visible:ring-0 pl-1 text-sm bg-transparent"
            />
          </div>

          {debouncedSearch && (
            <div className="mt-3 border border-sidebar-border rounded-lg bg-background overflow-hidden divide-y divide-sidebar-border max-w-xl shadow-md">
              {searchLoading ? (
                <div className="p-3 text-center text-muted-foreground text-xs">Searching…</div>
              ) : searchResults && searchResults.length > 0 ? (
                searchResults.map(c => (
                  <div key={c.id} className="flex items-center justify-between p-2.5 hover:bg-muted/10 transition-colors">
                    <div>
                      <p className="font-semibold text-sm">{c.name}</p>
                      <p className="text-xs text-muted-foreground">{c.phone}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setLocation(`/customers/${c.id}`)}
                        className="h-8 flex items-center gap-1.5 text-xs"
                      >
                        <Scissors className="h-3.5 w-3.5 text-muted-foreground" />
                        Measurements
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setLocation(`/customers/${c.id}?createOrder=true`)}
                        className="h-8 flex items-center gap-1.5 text-xs"
                      >
                        <Plus className="h-3.5 w-3.5 text-muted-foreground" />
                        New Order
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-3 text-center text-muted-foreground text-xs">No customers found</div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? <Skeleton className="h-8 w-20" /> : <div className="text-2xl font-bold">{stats?.totalCustomers || 0}</div>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Orders</CardTitle>
            <Scissors className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? <Skeleton className="h-8 w-20" /> : <div className="text-2xl font-bold">{(stats?.pendingOrders || 0) + (stats?.inStitchingOrders || 0) + (stats?.readyOrders || 0)}</div>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Collection</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? <Skeleton className="h-8 w-20" /> : <div className="text-2xl font-bold">Rs. {parseFloat(String(stats?.todayCollection ?? 0)).toLocaleString()}</div>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Remaining Balance</CardTitle>
            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? <Skeleton className="h-8 w-20" /> : <div className="text-2xl font-bold">Rs. {parseFloat(String(stats?.remainingBalance ?? 0)).toLocaleString()}</div>}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Recent Orders</CardTitle>
          </CardHeader>
          <CardContent>
            {ordersLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : recentOrders && recentOrders.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">{order.orderNumber}</TableCell>
                      <TableCell>{order.customerName}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getStatusColor(order.status)}>
                          {getStatusLabel(order.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">Rs. {Number(order.totalAmount).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">No recent orders</div>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Today's Deliveries</CardTitle>
          </CardHeader>
          <CardContent>
            {deliveriesLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : todayDeliveries && todayDeliveries.length > 0 ? (
              <div className="space-y-4">
                {todayDeliveries.map(order => (
                  <div key={order.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-primary/10 rounded-full">
                        <Package className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{order.customerName}</p>
                        <p className="text-sm text-muted-foreground">{order.orderNumber}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-destructive">Rs. {Number(order.balanceAmount).toLocaleString()} Due</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">No deliveries scheduled for today</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}