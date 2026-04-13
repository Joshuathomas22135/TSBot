import { ModalSubmitInteraction, Client } from "discord.js";
import { Options } from "./Options.js";

export interface Modal<T extends Record<string, any> = {}> {
  customId: string;
  run(params: T & { client: Client; interaction: ModalSubmitInteraction }): Promise<any>;
  options?: Options;
}