import { AnimatePresence } from "framer-motion";
import { useStore } from "@/store";
import { ProfileEditor } from "./ProfileEditor";
import { CategoryEditor } from "./CategoryEditor";
import { CostExplorer } from "./CostExplorer";
import { BulkRun } from "./BulkRun";
import { FavoriteEditor } from "./FavoriteEditor";

export function DialogManager() {
  const dialog = useStore((s) => s.dialog);
  const setDialog = useStore((s) => s.setDialog);

  const onClose = () => setDialog({ type: null });

  return (
    <AnimatePresence>
      {dialog.type === "profile-editor" && (
        <ProfileEditor key="profile-editor" data={dialog.data || {}} onClose={onClose} />
      )}
      {dialog.type === "category-editor" && (
        <CategoryEditor key="category-editor" data={dialog.data || {}} onClose={onClose} />
      )}
      {dialog.type === "cost-explorer" && (
        <CostExplorer key="cost-explorer" data={dialog.data || {}} onClose={onClose} />
      )}
      {dialog.type === "bulk-run" && (
        <BulkRun key="bulk-run" onClose={onClose} />
      )}
      {dialog.type === "favorite-editor" && (
        <FavoriteEditor key="favorite-editor" data={dialog.data || {}} onClose={onClose} />
      )}
    </AnimatePresence>
  );
}
