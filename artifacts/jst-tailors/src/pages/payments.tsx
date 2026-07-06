import { useState } from "react";
import { useListPayments, useCreatePayment, useDeletePayment, getListPaymentsQueryKey, useListOrders } from "@workspace/api-client-react";
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
import { Plus, MoreHorizontal, Trash, CreditCard } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

const paymentSchema = z.object({
  orderId: z.coerce.number().min(1, "Order is required"),
  amount: z.coerce.number().min(0.01, "Amount must be positive"),
  paymentDate: z.string().min(1, "Payment date is required"),
  notes: z.string().optional(),
});

type PaymentFormValues = z.infer<typeof paymentSchema>;

export default function Payments() {
  const queryClient = useQueryClient();
  const [isAddOpen, setIsAddOpen] = useState(false);

  const { data: payments, isLoading } = useListPayments();
  const { data: orders } = useListOrders();
  
  const createPayment = useCreatePayment();
  const deletePayment = useDeletePayment();

  const addForm = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: { 
      orderId: 0, 
      amount: 0, 
      paymentDate: new Date().toISOString().split('T')[0], 
      notes: "" 
    }
  });

  const onAddSubmit = (data: PaymentFormValues) => {
    // Need to find customerId from the selected order
    const selectedOrder = orders?.find(o => o.id === data.orderId);
    if (!selectedOrder) {
      toast.error("Invalid order selected");
      return;
    }

    createPayment.mutate({ data: { ...data, customerId: selectedOrder.customerId } }, {
      onSuccess: () => {
        toast.success("Payment recorded successfully");
        setIsAddOpen(false);
        addForm.reset();
        queryClient.invalidateQueries({ queryKey: getListPaymentsQueryKey() });
      },
      onError: () => toast.error("Failed to record payment")
    });
  };

  const handleDelete = (id: number) => {
    deletePayment.mutate({ id }, {
      onSuccess: () => {
        toast.success("Payment deleted successfully");
        queryClient.invalidateQueries({ queryKey: getListPaymentsQueryKey() });
      },
      onError: () => toast.error("Failed to delete payment")
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Payments</h2>
          <p className="text-muted-foreground mt-1">Record and track customer payments.</p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Plus className="mr-2 h-4 w-4" /> Record Payment
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Record New Payment</DialogTitle>
            </DialogHeader>
            <Form {...addForm}>
              <form onSubmit={addForm.handleSubmit(onAddSubmit)} className="space-y-4">
                <FormField control={addForm.control} name="orderId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Order</FormLabel>
                    <Select onValueChange={(val) => field.onChange(parseInt(val))} defaultValue={field.value ? field.value.toString() : ""}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Select an order" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {orders?.map(o => <SelectItem key={o.id} value={o.id.toString()}>{o.orderNumber} - {o.customerName} (Bal: Rs. {Number(o.balanceAmount).toLocaleString()})</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={addForm.control} name="amount" render={({ field }) => (
                  <FormItem><FormLabel>Amount</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={addForm.control} name="paymentDate" render={({ field }) => (
                  <FormItem><FormLabel>Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={addForm.control} name="notes" render={({ field }) => (
                  <FormItem><FormLabel>Notes</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
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

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-4 p-6">
              {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : payments && payments.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Order #</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>{format(new Date(payment.paymentDate), 'MMM d, yyyy')}</TableCell>
                    <TableCell className="font-medium">{payment.customerName}</TableCell>
                    <TableCell>{payment.orderNumber}</TableCell>
                    <TableCell className="text-muted-foreground">{payment.notes || "-"}</TableCell>
                    <TableCell className="text-right font-bold text-green-600 dark:text-green-400">
                      +Rs. {Number(payment.amount).toLocaleString()}
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
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive">
                                <Trash className="mr-2 h-4 w-4" /> Delete
                              </DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Payment</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete this payment of Rs. {Number(payment.amount).toLocaleString()}? This will increase the order's balance. This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(payment.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
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
                <CreditCard className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium">No payments recorded</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                Record your first payment to track income.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}