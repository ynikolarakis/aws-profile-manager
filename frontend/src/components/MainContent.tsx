import { IdentityBar } from "./IdentityBar";
import { FavoritesBar } from "./FavoritesBar";
import { Terminal } from "./Terminal/Terminal";

export function MainContent() {
  return (
    <div className="flex flex-col overflow-hidden bg-[var(--bg-0)]">
      <IdentityBar />
      <FavoritesBar />
      <Terminal />
    </div>
  );
}
