import { IdentityBar } from "./IdentityBar";
import { FavoritesBar } from "./FavoritesBar";
import { Terminal } from "./Terminal/Terminal";

export function MainContent() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        background: "var(--bg-0)",
      }}
    >
      <IdentityBar />
      <FavoritesBar />
      <Terminal />
    </div>
  );
}
