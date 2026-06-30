import { Outlet } from "react-router-dom";
import DevNav from "@/components/DevNav";
import { ViewportProvider } from "@/providers/ViewportProvider";
import { ToastProvider } from "@/providers/ToastProvider";
import { AuthProvider } from "@/providers/AuthProvider";
import { WizardProvider } from "@/providers/WizardProvider";

export default function App() {
  return (
    <AuthProvider>
      <WizardProvider>
        <ViewportProvider>
          <ToastProvider>
            <Outlet />
            {import.meta.env.DEV && <DevNav />}
          </ToastProvider>
        </ViewportProvider>
      </WizardProvider>
    </AuthProvider>
  );
}
