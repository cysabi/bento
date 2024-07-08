const box = async <S extends Record<string, unknown>>() =>
  // config: ServerConfig<S>
  {
    // const chain = {
    //   [Symbol.for("config")]: config,
    //   init: (init: (setter: Setter<S>) => Promise<void> | void) => {
    //     config.init = init;
    //     return chain;
    //   },
    // };
    // return chain;
  };

export type * from "./types";
export default { box };
