import { useEffect } from "react";
import { useStore } from "@/store";
import { useSSE } from "@/hooks/useSSE";
import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";
import { MainContent } from "@/components/MainContent";
import { DialogManager } from "@/components/dialogs/DialogManager";
import { DetailSheet } from "@/components/DetailSheet";
import { Toast } from "@/components/Toast";
import { CommandPalette } from "@/components/CommandPalette";

export default function App() {
  const init = useStore((s) => s.init);
  const setDialog = useStore((s) => s.setDialog);
  const setDetailProfile = useStore((s) => s.setDetailProfile);
  const setCommandPaletteOpen = useStore((s) => s.setCommandPaletteOpen);
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
      // Ctrl+K opens command palette
      if (e.key === "k" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        setCommandPaletteOpen(true);
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
  }, [setDialog, setDetailProfile, setCommandPaletteOpen]);

  return (
    <div
      id="app"
      className="grid h-screen relative"
      style={{
        gridTemplateRows: "44px 1fr",
        gridTemplateColumns: "var(--sidebar-w) 1fr",
      }}
    >
      <Header />
      <Sidebar />
      <MainContent />
      <DialogManager />
      <DetailSheet />
      <Toast />
      <CommandPalette />
    </div>
  );
}
