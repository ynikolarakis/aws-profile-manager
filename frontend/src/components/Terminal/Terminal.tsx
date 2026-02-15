import { TerminalChrome } from "./TerminalChrome";
import { TerminalOutput } from "./TerminalOutput";
import { TerminalInput } from "./TerminalInput";
import { AiCommandBar } from "./AiCommandBar";

export function Terminal() {
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <TerminalChrome />
      <TerminalOutput />
      <AiCommandBar />
      <TerminalInput />
    </div>
  );
}
