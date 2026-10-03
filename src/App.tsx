import { PlayerProvider } from "./ui/player";
import { Shell } from "./ui/Shell";

export function App() {
  return (
    <PlayerProvider>
      <Shell />
    </PlayerProvider>
  );
}
