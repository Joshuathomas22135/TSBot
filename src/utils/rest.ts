import { REST } from "@discordjs/rest";

export const createRest = (token: string): REST => {
  return new REST({ version: "10" }).setToken(token);
};