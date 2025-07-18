# `bento`
> an empathy-included framework for making web-based broadcast graphics with bun

A simple and lightweight state-machine server that feels as simple as writing a config file, and a compatible client you can use from anywhere.

- Stream minimal and bandwidth-efficient data patches to clients with websockets and msgpack
- Persist state locally with an embedded lmdb
- Compile to a standalone binary for portability
- [ ] Directly serve an ndi-based video feed with [wringer](https://github.com/cysabi/wringer) to bypass the need for browser sources

## usage
The library is published at https://jsr.io/@cysabi/bento

- First, create a new vite project and install `bento`
- Create a `bento.box.ts` file in the root of your vite project, and define your state server within:
  ```ts
  import bento from "bento";
  
  type State = {
    name: string;
  };

  bento.box<State>({
    name: "hello world!",
    changeName(set, payload: string) {
      set((state) => {
        state.name += payload;
      });
    },
  });
  ```
- Inside your vite frontend, create a new bento client and pass in a dispatch function. This is what it would look like with Solid for example:
  ```ts
  import { Client } from "bento/client";
  import { createSignal } from "solid-js";

  const [state, setState] = createSignal();
  const client = new Client((newState) => setState(newState));
  ```

- Run `bun bento.box.ts` to start your server
- Run `vite` to start your frontend!

The bento client will automatically attempt to connect to the localhost:4400

The bento server will also automatically search for a sibling `dist` folder, and serve it on demand as well

### portable mode
- You can compile the project to a single file executable by running:
  `bun build --compile ./bento.box.ts --outfile bento.box`
  > For more information, read https://bun.com/docs/bundler/executables
- Then, create a zip file containing the executable + the vite export `dist/` folder

---

*empathy included • [**@cysabi**](https://github.com/cysabi) • [cysabi.github.io](https://cysabi.github.io)*
