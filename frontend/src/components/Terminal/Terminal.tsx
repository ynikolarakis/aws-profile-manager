import { TerminalChrome } from "./TerminalChrome";
import { TerminalOutput } from "./TerminalOutput";
import { TerminalInput } from "./TerminalInput";

export function Terminal() {
  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <TerminalChrome />
      <TerminalOutput />
      <TerminalInput />
    </div>
  );
}
