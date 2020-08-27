import { Path } from '@quenk/noni/lib/io/file';
import { Future } from '@quenk/noni/lib/control/monad/future';

/**
 * Loader loads the parsed contents of a JCON file
 * into memory.
 */
export type Loader = (path: string) => Future<string>;

/**
 * Context the jcon file is complied in.
 */
export interface Context {

  /**
   * root is the path to the root directory of the project being compiled.
   */
  root: Path,

    /**
     * path to the directory being compiled.
     */
    path: Path,

    /**
     * loader configured for the Context.
     *
     * All paths are passed as encountered.
     */
    loader: Loader,

    /**
     * tendril import module path.
     */
    tendril: string,

    /**
     * EOL marker to use during compilation.
     */
    EOL: string

}
