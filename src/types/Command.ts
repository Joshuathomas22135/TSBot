import {
  ChatInputCommandInteraction,
  AutocompleteInteraction,
  SlashCommandBuilder,
  ContextMenuCommandBuilder,
  SlashCommandOptionsOnlyBuilder,
  SlashCommandSubcommandsOnlyBuilder,
  Client,
} from "discord.js";
import { Options } from "./Options";

export type CommandData =
  | SlashCommandBuilder
  | SlashCommandOptionsOnlyBuilder
  | SlashCommandSubcommandsOnlyBuilder
  | ContextMenuCommandBuilder;

export interface Command<T extends Record<string, any> = {}> {
  data: CommandData;
  run(params: T & { client: Client; interaction: ChatInputCommandInteraction }): Promise<any>;
  autocomplete?: (interaction: AutocompleteInteraction) => Promise<any>;
  options?: Options;
}