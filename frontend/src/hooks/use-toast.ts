interface ToastProps {
  title?: string
  description?: string
  variant?: "default" | "destructive"
}

export function toast({ title, description, variant = "default" }: ToastProps) {
  // Simple alert-based toast for now - can be replaced with proper toast library later
  const message = title + (description ? ': ' + description : '');
  
  if (variant === "destructive") {
    console.error(message);
    alert(`Error: ${message}`);
  } else {
    console.log(message);
    alert(`Success: ${message}`);
  }
}

export const useToast = () => {
  return { toast }
}
