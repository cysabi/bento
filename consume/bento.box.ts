import bento from "bento";

type State = {
  files: { name: string; data: ArrayBuffer; type: string }[];
};

export default bento.box<State>({ files: [] });
