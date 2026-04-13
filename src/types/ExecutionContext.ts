import { Client, Interaction } from "discord.js";
import { HandlerManager } from "../handlers/HandlerManager.js";

export interface ExecutionContext<T extends Interaction = Interaction> {
  client: Client;
  interaction: T;
  args?: any;
  handler: HandlerManager;
}