import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { insertRecommendationSchema, type InsertRecommendation, type Recommendation } from "@shared/schema";
import { useCreateRecommendation, useUpdateRecommendation } from "@/hooks/use-recommendations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { useToast } from "@/hooks/use-toast";

const formSchema = insertRecommendationSchema.extend({
  // Override or refine if needed, but schema matching is key
});

interface RecommendationFormProps {
  initialData?: Recommendation;
  onSuccess?: () => void;
}

export function RecommendationForm({ initialData, onSuccess }: RecommendationFormProps) {
  const { toast } = useToast();
  const createMutation = useCreateRecommendation();
  const updateMutation = useUpdateRecommendation();

  const isEditing = !!initialData;
  const isPending = createMutation.isPending || updateMutation.isPending;

  const form = useForm<InsertRecommendation>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData || {
      title: "",
      type: "Movie",
      genre: "",
      platform: "",
      recommendedBy: "",
      notes: "",
      status: "To Watch",
    },
  });

  async function onSubmit(data: InsertRecommendation) {
    try {
      if (isEditing && initialData) {
        await updateMutation.mutateAsync({ id: initialData.id, ...data });
        toast({ title: "Updated!", description: "Recommendation details saved." });
      } else {
        await createMutation.mutateAsync(data);
        toast({ title: "Added!", description: "New recommendation added to your list." });
        form.reset();
      }
      onSuccess?.();
    } catch (error) {
      toast({ 
        title: "Error", 
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive"
      });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Inception" {...field} className="bg-secondary/50 border-white/10 focus:border-primary/50" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Type</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="bg-secondary/50 border-white/10 focus:border-primary/50">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="bg-popover border-white/10">
                    <SelectItem value="Movie">Movie</SelectItem>
                    <SelectItem value="TV Show">TV Show</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="genre"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Genre</FormLabel>
                <FormControl>
                  <Input placeholder="Sci-Fi, Drama..." {...field} value={field.value || ""} className="bg-secondary/50 border-white/10 focus:border-primary/50" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="platform"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Platform</FormLabel>
                <FormControl>
                  <Input placeholder="Netflix, HBO..." {...field} value={field.value || ""} className="bg-secondary/50 border-white/10 focus:border-primary/50" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="recommendedBy"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Recommended By</FormLabel>
                <FormControl>
                  <Input placeholder="Friend's name" {...field} value={field.value || ""} className="bg-secondary/50 border-white/10 focus:border-primary/50" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Why should you watch this?" 
                  className="resize-none bg-secondary/50 border-white/10 focus:border-primary/50 min-h-[80px]" 
                  {...field} 
                  value={field.value || ""} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="pt-2">
          <Button 
            type="submit" 
            disabled={isPending}
            className="w-full bg-primary hover:bg-primary/90 text-white font-semibold py-6 rounded-xl shadow-lg shadow-primary/25 transition-all hover:scale-[1.02]"
          >
            {isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : isEditing ? (
              "Save Changes"
            ) : (
              "Add to Hotlist"
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
