import { useEffect } from "react";
import { useStore } from "@/store";
import { useSSE } from "@/hooks/useSSE";
import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";
import { MainContent } from "@/components/MainContent";
import { DialogManager } from "@/components/dialogs/DialogManager";
import { DetailSheet } from "@/components/DetailSheet";
import { Toast } from "@/components/Toast";

export default function App() {
  const init = useStore((s) => s.init);
  const setDialog = useStore((s) => s.setDialog);
  const setDetailProfile = useStore((s) => s.setDetailProfile);
  useSSE();

  useEffect(() => {
    init();
  }, [init]);

  // Global keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Escape closes dialogs/sheet
      if (e.key === "Escape") {
        setDialog({ type: null });
        setDetailProfile(null);
      }
      // Ctrl+/ focuses terminal
      if (e.key === "/" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        const input = document.querySelector<HTMLInputElement>('#app input[placeholder*="command"]');
        input?.focus();
      }
      // Ctrl+N new profile
      if (e.key === "n" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        setDialog({ type: "profile-editor", data: {} });
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [setDialog, setDetailProfile]);

  return (
    <div
      id="app"
      style={{
        display: "grid",
        gridTemplateRows: "44px 1fr",
        gridTemplateColumns: "var(--sidebar-w) 1fr",
        height: "100vh",
        position: "relative",
      }}
    >
      <Header />
      <Sidebar />
      <MainContent />
      <DialogManager />
      <DetailSheet />
      <Toast />
    </div>
  );
}
