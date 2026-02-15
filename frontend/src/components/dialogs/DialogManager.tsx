import { useStore } from "@/store";
import { ProfileEditor } from "./ProfileEditor";
import { CategoryEditor } from "./CategoryEditor";
import { CostExplorer } from "./CostExplorer";
import { BulkRun } from "./BulkRun";
import { FavoriteEditor } from "./FavoriteEditor";
import { SsoDiscover } from "./SsoDiscover";
import { Settings } from "./Settings";

export function DialogManager() {
  const dialog = useStore((s) => s.dialog);
  const setDialog = useStore((s) => s.setDialog);

  const onClose = () => setDialog({ type: null });

  return (
    <>
      {dialog.type === "profile-editor" && (
        <ProfileEditor data={dialog.data || {}} onClose={onClose} />
      )}
      {dialog.type === "category-editor" && (
        <CategoryEditor data={dialog.data || {}} onClose={onClose} />
      )}
      {dialog.type === "cost-explorer" && (
        <CostExplorer data={dialog.data || {}} onClose={onClose} />
      )}
      {dialog.type === "bulk-run" && (
        <BulkRun onClose={onClose} />
      )}
      {dialog.type === "favorite-editor" && (
        <FavoriteEditor data={dialog.data || {}} onClose={onClose} />
      )}
      {dialog.type === "sso-discover" && (
        <SsoDiscover data={dialog.data || {}} onClose={onClose} />
      )}
      {dialog.type === "settings" && (
        <Settings onClose={onClose} />
      )}
    </>
  );
}
