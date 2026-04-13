import { ExecutionContext } from "./ExecutionContext";

export interface Validation {
  name: string;
  execute(ctx: ExecutionContext): Promise<boolean>;
}
