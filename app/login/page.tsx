import { Suspense } from "react";
import AuthForm from "@/components/AuthForm";

// useSearchParams 需要 Suspense 边界
export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <AuthForm mode="login" />
    </Suspense>
  );
}
