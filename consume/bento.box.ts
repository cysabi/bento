import bento from "bento";
import { readdir } from "node:fs/promises";
import { watch } from "fs";
import { join } from "path";
import { consola } from "consola";

let countdown: Timer | null = null;

type State = {
  files: { name: string; data: ArrayBuffer; type: string }[];
};

function shuffle(array: any[]) {
  for (var i = array.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var temp = array[i];
    array[i] = array[j];
    array[j] = temp;
  }
  return array;
}

bento.box<State>(
  {
    files: [],
    setFiles: async (set, payload) => {
      set((state) => {
        if (!state.files.length) {
          consola.box(`Serving at http://localhost:4400`);
        }
        state.files = payload;
        consola.success(` Found ${payload.length} files!`);
      });
    },
  },
  (act) => {
    const dir = join(process.cwd(), "art");
    const syncFiles = async () => {
      const paths = await readdir(dir);
      const files = await Promise.all(
        paths.map(async (path) => {
          const file = Bun.file(join(dir, path));
          return {
            name: file.name?.split("/")?.at(-1)?.split(".")?.at(0),
            type: file.type,
            data: await file.arrayBuffer(),
          };
        })
      );
      act("setFiles", shuffle(files));
    };
    watch(dir, syncFiles);
    syncFiles();
  }
);
