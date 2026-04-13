import {
  StringSelectMenuInteraction,
  StringSelectMenuBuilder,
  APISelectMenuOption,
  Client,
} from "discord.js";
import { Options } from "./Options.js";

export interface Select<T extends Record<string, any> = {}> {
  customId: string;
  builder?: StringSelectMenuBuilder;
  run(params: T & { client: Client; interaction: StringSelectMenuInteraction }): Promise<any>;
  options?: Options;
}

export interface SelectOption {
  label: string;
  value: string;
  description?: string;
  emoji?: string;
  default?: boolean;
}

export interface SelectMenuData {
  customId: string;
  placeholder?: string;
  minValues?: number;
  maxValues?: number;
  options: SelectOption[];
}