import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useListOrders, useCreateOrder, useUpdateOrder, useDeleteOrder, getListOrdersQueryKey, useListCustomers, useCreatePayment, getListPaymentsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { Plus, MoreHorizontal, Edit, Trash, Scissors, CreditCard, Coins, CheckCircle } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

const orderSchema = z.object({
  customerId: z.coerce.number().min(1, "Customer is required"),
  orderDate: z.string().min(1, "Order date is required"),
  deliveryDate: z.string().optional(),
  status: z.enum(["pending", "in_stitching", "ready", "delivered"]).default("pending"),
  totalAmount: z.coerce.number().min(0, "Amount must be positive"),
  advanceAmount: z.coerce.number().min(0).default(0),
  notes: z.string().optional(),
}).refine(data => data.advanceAmount <= data.totalAmount, {
  message: "Advance amount cannot be greater than total amount",
  path: ["advanceAmount"],
});

type OrderFormValues = z.infer<typeof orderSchema>;

export default function Orders() {
  const queryClient = useQueryClient();
  const [location, setLocation] = useLocation();
  const [statusFilter, setStatusFilter] = useState<any>(undefined);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<any>(null);

  const { data: orders, isLoading } = useListOrders({ status: statusFilter });
  const { data: customers } = useListCustomers();
  
  const createOrder = useCreateOrder();
  const updateOrder = useUpdateOrder();
  const deleteOrder = useDeleteOrder();

  const [selectedPayOrder, setSelectedPayOrder] = useState<any>(null);
  const [isPayOpen, setIsPayOpen] = useState(false);
  const createPayment = useCreatePayment();

  const quickPaymentForm = useForm<any>({
    defaultValues: {
      amount: 0,
      paymentDate: new Date().toISOString().split('T')[0],
      notes: "",
    }
  });

  const openQuickPay = (order: any) => {
    setSelectedPayOrder(order);
    quickPaymentForm.reset({
      amount: Number(order.balanceAmount),
      paymentDate: new Date().toISOString().split('T')[0],
      notes: `Remaining Payment for Order ${order.orderNumber}`,
    });
    setIsPayOpen(true);
  };

  const onQuickPaySubmit = (data: any) => {
    if (!selectedPayOrder) return;
    createPayment.mutate({
      data: {
        orderId: selectedPayOrder.id,
        customerId: selectedPayOrder.customerId,
        amount: Number(data.amount),
        paymentDate: data.paymentDate,
        notes: data.notes || null,
      }
    }, {
      onSuccess: () => {
        toast.success("Payment recorded successfully!");
        setIsPayOpen(false);
        queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey() });
        queryClient.invalidateQueries({ queryKey: getListPaymentsQueryKey() });
      },
      onError: () => toast.error("Failed to record payment")
    });
  };

  const addForm = useForm<OrderFormValues>({
    resolver: zodResolver(orderSchema),
    defaultValues: { 
      customerId: 0, 
      orderDate: new Date().toISOString().split('T')[0], 
      status: "pending", 
      totalAmount: 0, 
      advanceAmount: 0, 
      notes: "" 
    }
  });

  // Auto-open create dialog with pre-selected customer from URL query param
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const preCustomerId = params.get("customerId");
    if (preCustomerId) {
      const id = parseInt(preCustomerId);
      if (!isNaN(id) && id > 0) {
        addForm.setValue("customerId", id);
        setIsAddOpen(true);
        // Clean the URL so refreshing doesn't re-open
        setLocation("/orders", { replace: true });
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const editForm = useForm<OrderFormValues>({
    resolver: zodResolver(orderSchema),
    defaultValues: { 
      customerId: 0, 
      orderDate: "", 
      status: "pending", 
      totalAmount: 0, 
      advanceAmount: 0, 
      notes: "" 
    }
  });

  const onAddSubmit = (data: OrderFormValues) => {
    createOrder.mutate({ data: { ...data, deliveryDate: data.deliveryDate || null } }, {
      onSuccess: () => {
        toast.success("Order created successfully");
        setIsAddOpen(false);
        addForm.reset();
        queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey() });
      },
      onError: () => toast.error("Failed to create order")
    });
  };

  const onEditSubmit = (data: OrderFormValues) => {
    if (!editingOrder) return;
    updateOrder.mutate({ id: editingOrder.id, data: { ...data, deliveryDate: data.deliveryDate || null } }, {
      onSuccess: () => {
        toast.success("Order updated successfully");
        setIsEditOpen(false);
        setEditingOrder(null);
        queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey() });
      },
      onError: () => toast.error("Failed to update order")
    });
  };

  const handleDelete = (id: number) => {
    deleteOrder.mutate({ id }, {
      onSuccess: () => {
        toast.success("Order deleted successfully");
        queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey() });
      },
      onError: () => toast.error("Failed to delete order")
    });
  };

  const openEdit = (order: any) => {
    setEditingOrder(order);
    editForm.reset({
      customerId: order.customerId,
      orderDate: order.orderDate.split('T')[0],
      deliveryDate: order.deliveryDate ? order.deliveryDate.split('T')[0] : "",
      status: order.status,
      totalAmount: order.totalAmount,
      advanceAmount: order.advanceAmount,
      notes: order.notes || "",
    });
    setIsEditOpen(true);
  };

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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Orders</h2>
          <p className="text-muted-foreground mt-1">Manage all tailoring orders and their status.</p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Plus className="mr-2 h-4 w-4" /> New Order
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Order</DialogTitle>
            </DialogHeader>
            <Form {...addForm}>
              <form onSubmit={addForm.handleSubmit(onAddSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={addForm.control} name="customerId" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Customer</FormLabel>
                      <Select
                        onValueChange={(val) => field.onChange(parseInt(val))}
                        value={field.value ? field.value.toString() : ""}
                      >
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder="Select a customer" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {customers?.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.name} ({c.phone})</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={addForm.control} name="status" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="in_stitching">In Stitching</SelectItem>
                          <SelectItem value="ready">Ready</SelectItem>
                          <SelectItem value="delivered">Delivered</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={addForm.control} name="orderDate" render={({ field }) => (
                    <FormItem><FormLabel>Order Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={addForm.control} name="deliveryDate" render={({ field }) => (
                    <FormItem><FormLabel>Delivery Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={addForm.control} name="totalAmount" render={({ field }) => (
                    <FormItem><FormLabel>Total Amount</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={addForm.control} name="advanceAmount" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Advance Amount</FormLabel>
                      <div className="flex gap-2">
                        <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                        <Button 
                          type="button" 
                          variant="secondary" 
                          onClick={() => {
                            const total = addForm.getValues("totalAmount");
                            addForm.setValue("advanceAmount", total);
                          }}
                        >
                          Full
                        </Button>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <FormField control={addForm.control} name="notes" render={({ field }) => (
                  <FormItem><FormLabel>Notes</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <DialogFooter>
                  <Button type="submit" disabled={createOrder.isPending}>
                    {createOrder.isPending ? "Creating..." : "Create Order"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center space-x-2">
            <Select value={statusFilter || "all"} onValueChange={(val) => setStatusFilter(val === "all" ? undefined : val)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Orders</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_stitching">In Stitching</SelectItem>
                <SelectItem value="ready">Ready</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : orders && orders.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Order Date</TableHead>
                  <TableHead>Delivery Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">{order.orderNumber}</TableCell>
                    <TableCell>{order.customerName}</TableCell>
                    <TableCell>{format(new Date(order.orderDate), 'MMM d, yyyy')}</TableCell>
                    <TableCell>{order.deliveryDate ? format(new Date(order.deliveryDate), 'MMM d, yyyy') : "-"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getStatusColor(order.status)}>
                        {getStatusLabel(order.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">Rs. {Number(order.totalAmount).toLocaleString()}</TableCell>
                    <TableCell className="text-right font-medium text-destructive">
                      <div className="flex items-center justify-end gap-1.5">
                        <span>Rs. {Number(order.balanceAmount).toLocaleString()}</span>
                        {order.status !== "delivered" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-green-600 hover:text-green-700 hover:bg-green-100 dark:text-green-500 dark:hover:bg-green-900/30"
                            onClick={() => {
                              updateOrder.mutate({ id: order.id, data: { status: "delivered" } }, {
                                onSuccess: () => {
                                  toast.success("Order marked as delivered!");
                                  queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey() });
                                }
                              });
                            }}
                            title="Mark as Delivered"
                            disabled={updateOrder.isPending}
                          >
                            <CheckCircle className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {Number(order.balanceAmount) > 0 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-primary hover:text-primary/80 hover:bg-primary/5"
                            onClick={() => openQuickPay(order)}
                            title="Record Payment for this Order"
                          >
                            <Coins className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => openEdit(order)}>
                            <Edit className="mr-2 h-4 w-4" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive">
                                <Trash className="mr-2 h-4 w-4" /> Delete
                              </DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Order</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete order {order.orderNumber}? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(order.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
                <Scissors className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium">No orders found</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                {statusFilter ? "No orders match the selected filter." : "Create your first order to get started."}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Order</DialogTitle>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={editForm.control} name="customerId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer</FormLabel>
                    <Select onValueChange={(val) => field.onChange(parseInt(val))} defaultValue={field.value ? field.value.toString() : ""}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Select a customer" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {customers?.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.name} ({c.phone})</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={editForm.control} name="status" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="in_stitching">In Stitching</SelectItem>
                        <SelectItem value="ready">Ready</SelectItem>
                        <SelectItem value="delivered">Delivered</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={editForm.control} name="orderDate" render={({ field }) => (
                  <FormItem><FormLabel>Order Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={editForm.control} name="deliveryDate" render={({ field }) => (
                  <FormItem><FormLabel>Delivery Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={editForm.control} name="totalAmount" render={({ field }) => (
                  <FormItem><FormLabel>Total Amount</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={editForm.control} name="advanceAmount" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Advance Amount</FormLabel>
                    <div className="flex gap-2">
                      <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                      <Button 
                        type="button" 
                        variant="secondary" 
                        onClick={() => {
                          const total = editForm.getValues("totalAmount");
                          editForm.setValue("advanceAmount", total);
                        }}
                      >
                        Full
                      </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <FormField control={editForm.control} name="notes" render={({ field }) => (
                <FormItem><FormLabel>Notes</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <DialogFooter>
                <Button type="submit" disabled={updateOrder.isPending}>
                  {updateOrder.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={isPayOpen} onOpenChange={setIsPayOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Record Payment for Order {selectedPayOrder?.orderNumber}</DialogTitle>
          </DialogHeader>
          <Form {...quickPaymentForm}>
            <form onSubmit={quickPaymentForm.handleSubmit(onQuickPaySubmit)} className="space-y-4">
              <FormField control={quickPaymentForm.control} name="amount" render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount Paid (Rs.)</FormLabel>
                  <FormControl>
                    <Input type="number" step="1" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={quickPaymentForm.control} name="paymentDate" render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={quickPaymentForm.control} name="notes" render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g. Remaining balance payment" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <DialogFooter>
                <Button type="submit" disabled={createPayment.isPending}>
                  {createPayment.isPending ? "Recording..." : "Record Payment"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}