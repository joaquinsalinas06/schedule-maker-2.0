export { useToast } from "@/components/ui/toast";

export function toast({ title, description, variant = "default" }: {
  title?: string
  description?: string
  variant?: "default" | "destructive" | "success"
}) {
  if (typeof window !== 'undefined') {
    // This function is mainly for backward compatibility
    // Direct usage of useToast hook is preferred
    console.log({ title, description, variant });
  }
}
