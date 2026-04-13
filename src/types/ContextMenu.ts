import {
  ContextMenuCommandBuilder,
  UserContextMenuCommandInteraction,
  MessageContextMenuCommandInteraction,
  Client,
} from "discord.js";
import { Options } from "./Options.js";

export interface ContextMenu<T extends Record<string, any> = {}> {
  data: ContextMenuCommandBuilder;
  run(
    params: T & {
      client: Client;
      interaction: UserContextMenuCommandInteraction | MessageContextMenuCommandInteraction;
    }
  ): Promise<any>;
  options?: Options;
}