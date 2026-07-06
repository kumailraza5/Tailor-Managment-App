import { useEffect, useRef, useState } from "react";
import { useGetSettings, useUpdateSettings, getGetSettingsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { Settings as SettingsIcon, Upload, X } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const settingsSchema = z.object({
  shopName: z.string().min(1, "Shop name is required"),
  shopLogo: z.string().optional().nullable(),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

export default function Settings() {
  const queryClient = useQueryClient();
  const { data: settings, isLoading } = useGetSettings();
  const updateSettings = useUpdateSettings();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: { shopName: "", shopLogo: "" }
  });

  useEffect(() => {
    if (settings) {
      form.reset({
        shopName: settings.shopName,
        shopLogo: settings.shopLogo || "",
      });
      if (settings.shopLogo) setLogoPreview(settings.shopLogo);
    }
  }, [settings, form]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxSizeMB = 5;
    if (file.size > maxSizeMB * 1024 * 1024) {
      toast.error(`Image must be smaller than ${maxSizeMB}MB`);
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Resize to max 256x256 and compress to JPEG 80%
        const MAX = 256;
        const scale = Math.min(MAX / img.width, MAX / img.height, 1);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const compressed = canvas.toDataURL("image/jpeg", 0.8);
        setLogoPreview(compressed);
        form.setValue("shopLogo", compressed, { shouldDirty: true });
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setLogoPreview(null);
    form.setValue("shopLogo", "", { shouldDirty: true });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const onSubmit = (data: SettingsFormValues) => {
    const payload = {
      shopName: data.shopName,
      shopLogo: data.shopLogo || null,
    };
    updateSettings.mutate({ data: payload }, {
      onSuccess: () => {
        toast.success("Settings saved successfully");
        queryClient.invalidateQueries({ queryKey: getGetSettingsQueryKey() });
      },
      onError: (err) => {
        console.error("Settings update failed:", err);
        toast.error("Failed to save settings. Please try again.");
      }
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
          <p className="text-muted-foreground mt-1">Manage your shop's configuration.</p>
        </div>
        <Card className="max-w-2xl">
          <CardHeader>
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-24 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground mt-1">Manage your shop's configuration and branding.</p>
      </div>

      <Card className="max-w-2xl border-sidebar-border shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SettingsIcon className="h-5 w-5" />
            General Settings
          </CardTitle>
          <CardDescription>
            Update your shop's identity used across the application.
          </CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="shopName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Shop Name</FormLabel>
                    <FormControl>
                      <Input {...field} className="max-w-md" />
                    </FormControl>
                    <FormDescription>
                      This name will be displayed in the sidebar and on customer receipts.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-3">
                <label className="text-sm font-medium leading-none">Shop Logo</label>
                <div className="flex items-start gap-4">
                  {/* Preview box */}
                  <div
                    className="relative w-24 h-24 rounded-xl border-2 border-dashed flex items-center justify-center bg-muted/50 text-muted-foreground overflow-hidden cursor-pointer hover:bg-muted/80 transition-colors group"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {logoPreview ? (
                      <>
                        <img
                          src={logoPreview}
                          alt="Shop logo preview"
                          className="w-full h-full object-contain p-1"
                        />
                        {/* Hover overlay */}
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Upload className="h-5 w-5 text-white" />
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center gap-1">
                        <Upload className="h-6 w-6 opacity-40" />
                        <span className="text-[10px] opacity-50">Click to upload</span>
                      </div>
                    )}
                  </div>

                  {/* Controls */}
                  <div className="space-y-2 pt-1">
                    {/* Hidden file input */}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/webp"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Upload className="h-3.5 w-3.5 mr-1.5" />
                        {logoPreview ? "Change Logo" : "Upload Logo"}
                      </Button>
                      {logoPreview && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={handleRemoveLogo}
                        >
                          <X className="h-3.5 w-3.5 mr-1" />
                          Remove
                        </Button>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Recommended size: 256×256px (PNG, JPG, WebP)
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Max file size: 2MB
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="border-t bg-muted/20 pt-6">
              <Button type="submit" disabled={updateSettings.isPending}>
                {updateSettings.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  );
}