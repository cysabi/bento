import { Client } from "bento/client";
import { createSignal } from "solid-js";

// bento client
type State = { name: string };

const [bento, dispatch] = createSignal<State>();
const client = new Client<State>(dispatch);

function App() {
  return (
    <div class="absolute inset-0 m-auto h-[1080px] w-[1920px] outline-red-500 outline-dashed outline-2 outline-offset-2 font-mono">
      <div class="flex flex-col items-center justify-center gap-4">
        {bento()?.name}
      </div>
      <button
        class="bg-slate-200"
        onclick={() => client.act("changeName", "meow")}
      >
        click
      </button>
    </div>
  );
}

export default App;
