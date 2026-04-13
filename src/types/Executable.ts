import { ExecutionContext } from "./ExecutionContext";
import { Options } from "./Options";

export interface Executable {
  run(ctx: ExecutionContext): Promise<any>;
  autocomplete?: (interaction: any) => Promise<any>;
  options?: Options;
}
