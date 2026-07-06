import { useParams, useLocation } from "wouter";
import {
  useGetCustomer,
  useGetCustomerMeasurements,
  useUpsertCustomerMeasurements,
  getGetCustomerMeasurementsQueryKey,
  getGetCustomerQueryKey,
  useCreateOrder,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import {
  ArrowLeft,
  Phone,
  MapPin,
  Scissors,
  CreditCard,
  ShoppingBag,
  Printer,
  Plus,
  Hash,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { formatCustomerId } from "@/lib/customer-id";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { useEffect, useRef, useState } from "react";

// ─── Schema ───────────────────────────────────────────────────────────────────
const measurementSchema = z.object({
  // Kameez
  length: z.coerce.number().optional(),
  shoulder: z.coerce.number().optional(),
  sleeve: z.coerce.number().optional(),
  chest: z.coerce.number().optional(),
  waist: z.coerce.number().optional(),
  hip: z.coerce.number().optional(),
  ghera: z.coerce.number().optional(),
  collar: z.coerce.number().optional(),
  frontPatti: z.coerce.number().optional(),
  cuff: z.coerce.number().optional(),
  pocket: z.coerce.number().optional(),
  // Shalwar
  shalwarLength: z.coerce.number().optional(),
  bottom: z.coerce.number().optional(),
  shalwarGhair: z.coerce.number().optional(),
  shalwarPocket: z.coerce.number().optional(),
  // Additional Options
  buttonsType: z.string().optional(),
  collarType: z.string().optional(),
  gheraStyle: z.string().optional(),
  // Notes
  additionalNotes: z.string().optional(),
});

type MeasurementFormValues = z.infer<typeof measurementSchema>;

const orderInputSchema = z.object({
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

type OrderInputFormValues = z.infer<typeof orderInputSchema>;

// ─── Shared sub-components ────────────────────────────────────────────────────

/** Numeric measurement input with bilingual label */
const MeasurementField = ({
  form,
  name,
  enLabel,
  urLabel,
}: {
  form: any;
  name: keyof MeasurementFormValues;
  enLabel: string;
  urLabel: string;
}) => (
  <FormField
    control={form.control}
    name={name}
    render={({ field }) => (
      <FormItem>
        <FormLabel className="flex justify-between items-center text-sm">
          <span>{enLabel}</span>
          <span className="font-urdu text-right text-muted-foreground" dir="rtl">
            {urLabel}
          </span>
        </FormLabel>
        <FormControl>
          <Input
            type="number"
            step="0.25"
            placeholder="0"
            {...field}
            value={field.value ?? ""}
          />
        </FormControl>
        <FormMessage />
      </FormItem>
    )}
  />
);

/** Select dropdown field */
const SelectField = ({
  form,
  name,
  label,
  options,
}: {
  form: any;
  name: keyof MeasurementFormValues;
  label: string;
  options: { value: string; label: string }[];
}) => (
  <FormField
    control={form.control}
    name={name}
    render={({ field }) => (
      <FormItem>
        <FormLabel className="text-sm">{label}</FormLabel>
        <Select onValueChange={field.onChange} value={field.value ?? ""}>
          <FormControl>
            <SelectTrigger>
              <SelectValue placeholder="Select…" />
            </SelectTrigger>
          </FormControl>
          <SelectContent>
            {options.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <FormMessage />
      </FormItem>
    )}
  />
);

// ─── Section card wrapper ─────────────────────────────────────────────────────
const SectionCard = ({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) => (
  <Card className="border-sidebar-border shadow-sm">
    <CardHeader className="pb-4">
      <CardTitle className="flex items-center gap-2 text-lg">
        {icon}
        {title}
      </CardTitle>
    </CardHeader>
    <CardContent>{children}</CardContent>
  </Card>
);

// ─── Main component ───────────────────────────────────────────────────────────
export default function CustomerProfile() {
  const params = useParams();
  const customerId = parseInt(params.id || "0");
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const printRef = useRef<HTMLDivElement>(null);

  const { data: customer, isLoading: customerLoading } = useGetCustomer(
    customerId,
    { query: { enabled: !!customerId, queryKey: getGetCustomerQueryKey(customerId) } }
  );

  const { data: measurements, isLoading: measurementsLoading } =
    useGetCustomerMeasurements(customerId, {
      query: {
        enabled: !!customerId,
        queryKey: getGetCustomerMeasurementsQueryKey(customerId),
      },
    });

  const upsertMeasurements = useUpsertCustomerMeasurements();

  const form = useForm<MeasurementFormValues>({
    resolver: zodResolver(measurementSchema),
    defaultValues: {},
  });

  useEffect(() => {
    if (measurements) {
      form.reset({
        length: measurements.length ? Number(measurements.length) : undefined,
        shoulder: measurements.shoulder ? Number(measurements.shoulder) : undefined,
        sleeve: measurements.sleeve ? Number(measurements.sleeve) : undefined,
        chest: measurements.chest ? Number(measurements.chest) : undefined,
        waist: measurements.waist ? Number(measurements.waist) : undefined,
        hip: measurements.hip ? Number(measurements.hip) : undefined,
        ghera: measurements.ghera ? Number(measurements.ghera) : undefined,
        collar: measurements.collar ? Number(measurements.collar) : undefined,
        frontPatti: measurements.frontPatti ? Number(measurements.frontPatti) : undefined,
        cuff: measurements.cuff ? Number(measurements.cuff) : undefined,
        pocket: measurements.pocket ? Number(measurements.pocket) : undefined,
        shalwarLength: measurements.shalwarLength ? Number(measurements.shalwarLength) : undefined,
        bottom: measurements.bottom ? Number(measurements.bottom) : undefined,
        shalwarGhair: measurements.shalwarGhair ? Number(measurements.shalwarGhair) : undefined,
        shalwarPocket: measurements.shalwarPocket ? Number(measurements.shalwarPocket) : undefined,
        buttonsType: measurements.buttonsType ?? undefined,
        collarType: measurements.collarType ?? undefined,
        gheraStyle: measurements.gheraStyle ?? undefined,
        additionalNotes: measurements.additionalNotes ?? undefined,
      });
    }
  }, [measurements, form]);

  const [isCreateOrderOpen, setIsCreateOrderOpen] = useState(false);
  const createOrder = useCreateOrder();

  const orderForm = useForm<OrderInputFormValues>({
    resolver: zodResolver(orderInputSchema),
    defaultValues: {
      orderDate: new Date().toISOString().split('T')[0],
      status: "pending",
      totalAmount: 0,
      advanceAmount: 0,
      notes: ""
    }
  });

  // Auto-open order dialog if directed from customer list page
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get("createOrder") === "true") {
      setIsCreateOrderOpen(true);
      // Clean query parameters from URL
      const path = window.location.pathname;
      window.history.replaceState(null, "", path);
    }
  }, []);

  const [selectedPrintOrder, setSelectedPrintOrder] = useState<any>(null);

  useEffect(() => {
    if (customer?.orders && customer.orders.length > 0 && !selectedPrintOrder) {
      setSelectedPrintOrder(customer.orders[0]);
    }
  }, [customer, selectedPrintOrder]);

  const onSubmit = (data: MeasurementFormValues) => {
    upsertMeasurements.mutate(
      { id: customerId, data },
      {
        onSuccess: () => {
          toast.success("Measurements saved! Opening order creation…");
          queryClient.invalidateQueries({
            queryKey: getGetCustomerMeasurementsQueryKey(customerId),
          });
          // Open the order dialog directly on this page
          setIsCreateOrderOpen(true);
        },
        onError: () => toast.error("Failed to save measurements"),
      }
    );
  };

  const onOrderSubmit = (data: OrderInputFormValues) => {
    createOrder.mutate({ data: { ...data, customerId, deliveryDate: data.deliveryDate || null } }, {
      onSuccess: () => {
        toast.success("Order created successfully!");
        setIsCreateOrderOpen(false);
        orderForm.reset();
        queryClient.invalidateQueries({ queryKey: getGetCustomerQueryKey(customerId) });
      },
      onError: () => toast.error("Failed to create order")
    });
  };

  const handlePrint = () => window.print();

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300";
      case "in_stitching": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
      case "ready": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "delivered": return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusLabel = (status: string) =>
    status.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase());

  // ─── Loading ───────────────────────────────────────────────────────────────
  if (customerLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          <Skeleton className="h-32 col-span-1" />
          <Skeleton className="h-[400px] col-span-2" />
        </div>
      </div>
    );
  }

  if (!customer) return <div>Customer not found</div>;

  const vals = form.getValues();

  // ─── Print receipt values (read from saved measurements so they reflect DB) ──
  const m = measurements;
  const displayVal = (v: string | number | null | undefined) =>
    v != null && v !== "" ? String(v) : "—";

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => setLocation("/customers")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-3xl font-bold tracking-tight">{customer.name}</h2>
              <Badge
                variant="secondary"
                className="text-sm font-mono font-semibold px-3 py-1 bg-primary/10 text-primary border border-primary/20"
              >
                <Hash className="h-3.5 w-3.5 mr-1" />
                {formatCustomerId(customer.id)}
              </Badge>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
              <span className="flex items-center gap-1">
                <Phone className="h-3 w-3" /> {customer.phone}
              </span>
              {customer.address && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> {customer.address}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 print:hidden">
          <Button
            variant="default"
            onClick={() => setIsCreateOrderOpen(true)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            New Order
          </Button>
          <Button
            variant="outline"
            onClick={handlePrint}
            className="flex items-center gap-2"
            id="print-parchi-btn"
          >
            <Printer className="h-4 w-4" />
            {selectedPrintOrder ? `Print Parchi (${selectedPrintOrder.orderNumber})` : "Print Parchi"}
          </Button>
        </div>
      </div>

      {/* ── Layout ─────────────────────────────────────────────────────────── */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Summary card */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Customer Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Customer ID */}
            <div className="rounded-lg bg-primary/5 border border-primary/15 px-4 py-3 flex items-center justify-between">
              <span className="text-muted-foreground flex items-center gap-2 text-sm">
                <Hash className="h-4 w-4" /> Customer ID
              </span>
              <span className="font-mono font-bold text-primary text-sm tracking-wide">
                {formatCustomerId(customer.id)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground flex items-center gap-2">
                <ShoppingBag className="h-4 w-4" /> Total Orders
              </span>
              <span className="font-medium">{customer.totalOrders || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground flex items-center gap-2">
                <CreditCard className="h-4 w-4" /> Total Paid
              </span>
              <span className="font-medium text-green-600 dark:text-green-400">
                Rs. {parseFloat(String(customer.totalPaid || 0)).toFixed(0)}
              </span>
            </div>
            <div className="flex items-center justify-between pt-4 border-t">
              <span className="font-medium flex items-center gap-2">Balance Due</span>
              <span className="font-bold text-destructive">
                Rs. {parseFloat(String(customer.totalBalance || 0)).toFixed(0)}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <div className="col-span-2">
          <Tabs defaultValue="measurements" className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-muted mb-4">
              <TabsTrigger value="measurements">
                <Scissors className="h-4 w-4 mr-1" /> Measurements
              </TabsTrigger>
              <TabsTrigger value="orders">Order History</TabsTrigger>
              <TabsTrigger value="payments">Payment History</TabsTrigger>
            </TabsList>

            {/* ── Measurements tab ────────────────────────────────────────── */}
            <TabsContent value="measurements">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  {/* 1 — Kameez */}
                  <SectionCard
                    icon={<span className="text-xl">👔</span>}
                    title="Kameez Measurements"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      <MeasurementField form={form} name="length" enLabel="Length" urLabel="لمبائی" />
                      <MeasurementField form={form} name="sleeve" enLabel="Sleeves" urLabel="آستین" />
                      <MeasurementField form={form} name="shoulder" enLabel="Shoulders" urLabel="کندھا" />
                      <MeasurementField form={form} name="chest" enLabel="Chest" urLabel="چھاتی" />
                      <MeasurementField form={form} name="waist" enLabel="Waist" urLabel="کمر" />
                      <MeasurementField form={form} name="hip" enLabel="Hip" urLabel="ہپ" />
                      <MeasurementField form={form} name="ghera" enLabel="Ghera" urLabel="گھیرا" />
                      <MeasurementField form={form} name="collar" enLabel="Collar / Ban" urLabel="کالر / بین" />
                      <MeasurementField form={form} name="frontPatti" enLabel="Front Patti" urLabel="فرنٹ پٹی" />
                      <MeasurementField form={form} name="cuff" enLabel="Cuff" urLabel="کف" />
                      <MeasurementField form={form} name="pocket" enLabel="Pocket" urLabel="جیب" />
                    </div>
                  </SectionCard>

                  {/* 2 — Shalwar */}
                  <SectionCard
                    icon={<span className="text-xl">👖</span>}
                    title="Shalwar Measurements"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      <MeasurementField form={form} name="shalwarLength" enLabel="Shalwar Length" urLabel="شلوار لمبائی" />
                      <MeasurementField form={form} name="bottom" enLabel="Bottom" urLabel="پانچہ" />
                      <MeasurementField form={form} name="shalwarGhair" enLabel="Ghair" urLabel="گھیر" />
                      <MeasurementField form={form} name="shalwarPocket" enLabel="Pocket" urLabel="جیب" />
                    </div>
                  </SectionCard>

                  {/* 3 — Additional Options */}
                  <SectionCard
                    icon={<span className="text-xl">⚙️</span>}
                    title="Additional Options"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <SelectField
                        form={form}
                        name="buttonsType"
                        label="Buttons"
                        options={[
                          { value: "simple", label: "Simple" },
                          { value: "fancy", label: "Fancy" },
                          { value: "metal", label: "Metal" },
                        ]}
                      />
                      <SelectField
                        form={form}
                        name="collarType"
                        label="Collar Type"
                        options={[
                          { value: "ban", label: "Ban" },
                          { value: "collar", label: "Collar" },
                        ]}
                      />
                      <SelectField
                        form={form}
                        name="gheraStyle"
                        label="Ghera Style"
                        options={[
                          { value: "simple", label: "Simple" },
                          { value: "lengthy", label: "Lengthy" },
                        ]}
                      />
                    </div>
                  </SectionCard>

                  {/* 4 — Additional Notes */}
                  <SectionCard
                    icon={<span className="text-xl">📝</span>}
                    title="Additional Notes"
                  >
                    <FormField
                      control={form.control}
                      name="additionalNotes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm text-muted-foreground">
                            These notes will be printed on the receipt / parchi.
                          </FormLabel>
                          <FormControl>
                            <Textarea
                              rows={3}
                              placeholder="Any special instructions…"
                              {...field}
                              value={field.value ?? ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </SectionCard>

                  {/* Save button */}
                  <div className="flex justify-end">
                    <Button
                      type="submit"
                      disabled={upsertMeasurements.isPending}
                      className="px-8"
                      id="save-measurements-btn"
                    >
                      {upsertMeasurements.isPending ? "Saving…" : "Save Measurements"}
                    </Button>
                  </div>
                </form>
              </Form>
            </TabsContent>

            {/* ── Orders tab ──────────────────────────────────────────────── */}
            <TabsContent value="orders">
              {customer.orders && customer.orders.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order #</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                      <TableHead className="text-right print:hidden">Print</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customer.orders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">{order.orderNumber}</TableCell>
                        <TableCell>
                          {format(new Date(order.orderDate), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={getStatusColor(order.status)}
                          >
                            {getStatusLabel(order.status)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          Rs. {Number(order.totalAmount).toFixed(0)}
                        </TableCell>
                        <TableCell className="text-right font-medium text-destructive">
                          Rs. {Number(order.balanceAmount).toFixed(0)}
                        </TableCell>
                        <TableCell className="text-right print:hidden">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => {
                              setSelectedPrintOrder(order);
                              setTimeout(() => window.print(), 100);
                            }}
                            title="Print this order slip"
                          >
                            <Printer className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No orders found for this customer.
                </div>
              )}
            </TabsContent>

            {/* ── Payments tab ────────────────────────────────────────────── */}
            <TabsContent value="payments">
              {customer.payments && customer.payments.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Order #</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customer.payments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>
                          {format(new Date(payment.paymentDate), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell>{payment.orderNumber}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {payment.notes || "—"}
                        </TableCell>
                        <TableCell className="text-right font-medium text-green-600 dark:text-green-400">
                          Rs. {Number(payment.amount).toFixed(0)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No payments found for this customer.
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          PRINT RECEIPT — hidden on screen, visible on print only
      ══════════════════════════════════════════════════════════════════════ */}
      <div id="tailor-slip" ref={printRef}>
        <div className="slip-header">
          <h1>JST Tailors</h1>
          <p className="slip-tagline">FOR MEN · SINCE 1980</p>
        </div>

        <div className="slip-info">
          <div className="slip-row"><span>Customer ID</span><span className="font-mono">{formatCustomerId(customer.id)}</span></div>
          <div className="slip-row"><span>Customer</span><span>{customer.name}</span></div>
          <div className="slip-row"><span>Phone</span><span>{customer.phone}</span></div>
          {selectedPrintOrder ? (
            <>
              <div className="slip-row"><span>Order #</span><span className="font-mono">{selectedPrintOrder.orderNumber}</span></div>
              <div className="slip-row">
                <span>Delivery Date</span>
                <span>{selectedPrintOrder.deliveryDate ? format(new Date(selectedPrintOrder.deliveryDate), "dd/MM/yyyy") : "—"}</span>
              </div>
            </>
          ) : null}
          <div className="slip-row">
            <span>Print Date</span>
            <span>{format(new Date(), "dd/MM/yyyy")}</span>
          </div>
        </div>

        <div className="slip-divider" />

        <div className="slip-section-title">👔 KAMEEZ</div>
        <div className="slip-grid">
          <div className="slip-row"><span>Length / لمبائی</span><span>{displayVal(m?.length)}</span></div>
          <div className="slip-row"><span>Sleeves / آستین</span><span>{displayVal(m?.sleeve)}</span></div>
          <div className="slip-row"><span>Shoulders / کندھا</span><span>{displayVal(m?.shoulder)}</span></div>
          <div className="slip-row"><span>Chest / چھاتی</span><span>{displayVal(m?.chest)}</span></div>
          <div className="slip-row"><span>Waist / کمر</span><span>{displayVal(m?.waist)}</span></div>
          <div className="slip-row"><span>Hip / ہپ</span><span>{displayVal(m?.hip)}</span></div>
          <div className="slip-row"><span>Ghera / گھیرا</span><span>{displayVal(m?.ghera)}</span></div>
          <div className="slip-row"><span>Collar/Ban / کالر</span><span>{displayVal(m?.collar)}</span></div>
          <div className="slip-row"><span>Front Patti / فرنٹ پٹی</span><span>{displayVal(m?.frontPatti)}</span></div>
          <div className="slip-row"><span>Cuff / کف</span><span>{displayVal(m?.cuff)}</span></div>
          <div className="slip-row"><span>Pocket / جیب</span><span>{displayVal(m?.pocket)}</span></div>
        </div>

        <div className="slip-divider" />

        <div className="slip-section-title">👖 SHALWAR</div>
        <div className="slip-grid">
          <div className="slip-row"><span>Length / لمبائی</span><span>{displayVal(m?.shalwarLength)}</span></div>
          <div className="slip-row"><span>Bottom / پانچہ</span><span>{displayVal(m?.bottom)}</span></div>
          <div className="slip-row"><span>Ghair / گھیر</span><span>{displayVal(m?.shalwarGhair)}</span></div>
          <div className="slip-row"><span>Pocket / جیب</span><span>{displayVal(m?.shalwarPocket)}</span></div>
        </div>

        <div className="slip-divider" />

        <div className="slip-section-title">⚙ ADDITIONAL</div>
        <div className="slip-grid">
          <div className="slip-row">
            <span>Buttons / بٹن</span>
            <span>{displayVal(m?.buttonsType)}</span>
          </div>
          <div className="slip-row">
            <span>Collar Type / کالر قسم</span>
            <span>{displayVal(m?.collarType)}</span>
          </div>
          <div className="slip-row">
            <span>Ghera Style / گھیرا</span>
            <span>{displayVal(m?.gheraStyle)}</span>
          </div>
        </div>

        {(customer.notes || m?.additionalNotes || selectedPrintOrder?.notes) && (
          <>
            <div className="slip-divider" />
            <div className="slip-section-title">📝 NOTES</div>
            {selectedPrintOrder?.notes && (
              <div className="slip-notes mb-2">
                <strong>Order:</strong> {selectedPrintOrder.notes}
              </div>
            )}
            {customer.notes && (
              <div className="slip-notes mb-2">
                <strong>Client:</strong> {customer.notes}
              </div>
            )}
            {m?.additionalNotes && (
              <div className="slip-notes">
                <strong>Measurements:</strong> {m.additionalNotes}
              </div>
            )}
          </>
        )}

        <div className="slip-divider" />

        <div className="slip-section-title">💰 BALANCE</div>
        <div className="slip-grid">
          {selectedPrintOrder ? (
            <>
              <div className="slip-row">
                <span>Order Total</span>
                <span>Rs. {parseFloat(String(selectedPrintOrder.totalAmount || 0)).toFixed(0)}</span>
              </div>
              <div className="slip-row">
                <span>Paid (Advance)</span>
                <span>Rs. {parseFloat(String(selectedPrintOrder.advanceAmount || 0)).toFixed(0)}</span>
              </div>
              <div className="slip-row slip-balance-row">
                <span>Balance Due</span>
                <span>Rs. {parseFloat(String(selectedPrintOrder.balanceAmount || 0)).toFixed(0)}</span>
              </div>
            </>
          ) : (
            <>
              <div className="slip-row">
                <span>Total Account</span>
                <span>Rs. {(parseFloat(String(customer.totalPaid || 0)) + parseFloat(String(customer.totalBalance || 0))).toFixed(0)}</span>
              </div>
              <div className="slip-row">
                <span>Total Paid</span>
                <span>Rs. {parseFloat(String(customer.totalPaid || 0)).toFixed(0)}</span>
              </div>
              <div className="slip-row slip-balance-row">
                <span>Balance Due</span>
                <span>Rs. {parseFloat(String(customer.totalBalance || 0)).toFixed(0)}</span>
              </div>
            </>
          )}
        </div>

        <div className="slip-divider" />
        <div className="slip-footer">
          <p>Thank You!</p>
          <p className="slip-shop">JST Tailors — For Men · Since 1980</p>
        </div>
      </div>

      {/* ─── Create Order Dialog ────────────────────────────────────────────── */}
      <Dialog open={isCreateOrderOpen} onOpenChange={setIsCreateOrderOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Create New Order</DialogTitle>
          </DialogHeader>
          <Form {...orderForm}>
            <form onSubmit={orderForm.handleSubmit(onOrderSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField control={orderForm.control} name="orderDate" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Order Date</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={orderForm.control} name="deliveryDate" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Delivery Date</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={orderForm.control} name="totalAmount" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Total Amount (Rs.)</FormLabel>
                    <FormControl><Input type="number" step="1" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={orderForm.control} name="advanceAmount" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Advance Paid (Rs.)</FormLabel>
                    <div className="flex gap-2">
                      <FormControl><Input type="number" step="1" {...field} /></FormControl>
                      <Button 
                        type="button" 
                        variant="secondary" 
                        onClick={() => {
                          const total = orderForm.getValues("totalAmount");
                          orderForm.setValue("advanceAmount", total);
                        }}
                      >
                        Full
                      </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <FormField control={orderForm.control} name="notes" render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl><Input placeholder="E.g. Double stitching, urgent" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={() => setIsCreateOrderOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createOrder.isPending}>
                  {createOrder.isPending ? "Creating…" : "Create Order"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}