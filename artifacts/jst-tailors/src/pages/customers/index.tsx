import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useListCustomers, useCreateCustomer, useUpdateCustomer, useDeleteCustomer, getListCustomersQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { Search, Plus, MoreHorizontal, Edit, Trash, Eye, Users, Scissors } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { formatCustomerId } from "@/lib/customer-id";

const customerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().min(1, "Phone is required"),
  address: z.string().optional(),
  notes: z.string().optional(),
});

type CustomerFormValues = z.infer<typeof customerSchema>;

export default function Customers() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<any>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const { data: customers, isLoading } = useListCustomers({ search: debouncedSearch });
  
  const createCustomer = useCreateCustomer();
  const updateCustomer = useUpdateCustomer();
  const deleteCustomer = useDeleteCustomer();

  const addForm = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
    defaultValues: { name: "", phone: "", address: "", notes: "" }
  });

  const editForm = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
    defaultValues: { name: "", phone: "", address: "", notes: "" }
  });

  const onAddSubmit = (data: CustomerFormValues) => {
    createCustomer.mutate({ data }, {
      onSuccess: (newCustomer) => {
        toast.success("Customer added successfully");
        setIsAddOpen(false);
        addForm.reset();
        queryClient.invalidateQueries({ queryKey: getListCustomersQueryKey() });
        setLocation(`/customers/${newCustomer.id}`);
      },
      onError: () => toast.error("Failed to add customer")
    });
  };

  const onEditSubmit = (data: CustomerFormValues) => {
    if (!editingCustomer) return;
    updateCustomer.mutate({ id: editingCustomer.id, data }, {
      onSuccess: () => {
        toast.success("Customer updated successfully");
        setIsEditOpen(false);
        setEditingCustomer(null);
        queryClient.invalidateQueries({ queryKey: getListCustomersQueryKey() });
      },
      onError: () => toast.error("Failed to update customer")
    });
  };

  const handleDelete = (id: number) => {
    deleteCustomer.mutate({ id }, {
      onSuccess: () => {
        toast.success("Customer deleted successfully");
        queryClient.invalidateQueries({ queryKey: getListCustomersQueryKey() });
      },
      onError: () => toast.error("Failed to delete customer")
    });
  };

  const openEdit = (customer: any) => {
    setEditingCustomer(customer);
    editForm.reset({
      name: customer.name,
      phone: customer.phone,
      address: customer.address || "",
      notes: customer.notes || "",
    });
    setIsEditOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Customers</h2>
          <p className="text-muted-foreground mt-1">Manage your clients and their measurements.</p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Plus className="mr-2 h-4 w-4" /> Add Customer
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Customer</DialogTitle>
            </DialogHeader>
            <Form {...addForm}>
              <form onSubmit={addForm.handleSubmit(onAddSubmit)} className="space-y-4">
                <FormField control={addForm.control} name="name" render={({ field }) => (
                  <FormItem><FormLabel>Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={addForm.control} name="phone" render={({ field }) => (
                  <FormItem><FormLabel>Phone</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={addForm.control} name="address" render={({ field }) => (
                  <FormItem><FormLabel>Address</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <DialogFooter>
                  <Button type="submit" disabled={createCustomer.isPending}>
                    {createCustomer.isPending ? "Saving..." : "Save Customer"}
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
            <Search className="w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search customers by name, phone..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm border-0 shadow-none focus-visible:ring-0 pl-0"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : customers && customers.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[110px]">Customer ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className="font-mono font-semibold text-xs px-2 py-0.5 bg-primary/10 text-primary border border-primary/20"
                      >
                        {formatCustomerId(customer.id)}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{customer.name}</TableCell>
                    <TableCell>{customer.phone}</TableCell>
                    <TableCell className="text-muted-foreground truncate max-w-[200px]">{customer.address || "-"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setLocation(`/customers/${customer.id}`)}
                          className="h-8 flex items-center gap-1.5 text-xs"
                        >
                          <Scissors className="h-3.5 w-3.5 text-muted-foreground" />
                          Measurements
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setLocation(`/customers/${customer.id}?createOrder=true`)}
                          className="h-8 flex items-center gap-1.5 text-xs"
                        >
                          <Plus className="h-3.5 w-3.5 text-muted-foreground" />
                          New Order
                        </Button>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => setLocation(`/customers/${customer.id}`)}>
                            <Eye className="mr-2 h-4 w-4" /> View Profile
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEdit(customer)}>
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
                                <AlertDialogTitle>Delete Customer</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete {customer.name}? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(customer.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
                <Users className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium">No customers found</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                {searchTerm ? "Try adjusting your search terms." : "Get started by adding your first customer."}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Customer</DialogTitle>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
              <FormField control={editForm.control} name="name" render={({ field }) => (
                <FormItem><FormLabel>Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={editForm.control} name="phone" render={({ field }) => (
                <FormItem><FormLabel>Phone</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={editForm.control} name="address" render={({ field }) => (
                <FormItem><FormLabel>Address</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <DialogFooter>
                <Button type="submit" disabled={updateCustomer.isPending}>
                  {updateCustomer.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}