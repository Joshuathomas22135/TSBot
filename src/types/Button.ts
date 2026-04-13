import { ButtonInteraction, Client } from "discord.js";
import { Options } from "./Options.js";

export interface Button<T extends Record<string, any> = {}> {
  customId: string;
  run(params: T & { client: Client; interaction: ButtonInteraction }): Promise<any>;
  options?: Options;
}