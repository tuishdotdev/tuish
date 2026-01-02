import type { OutputAdapter } from '@tuish/cli-core';

export function createNodeOutputAdapter(): OutputAdapter {
  return {
    write: (text: string) => {
      process.stdout.write(text);
    },
    writeLine: (text: string) => {
      console.log(text);
    },
    clear: () => {
      console.clear();
    },
  };
}
