import bento from "bento";

type State = {
  name: string;
};

bento.box<State>({
  name: "hello world",
  changeName(set, payload) {
    set((state) => {
      state.name = state.name + " " + payload;
    });
  },
});
