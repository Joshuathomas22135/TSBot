import { ClientEvents, Events } from "discord.js";
import { Options } from "./Options.js";
import { HandlerManager } from "../handlers/HandlerManager.js";

type EventNameMap = {
  [K in keyof typeof Events]: (typeof Events)[K] extends keyof ClientEvents ? (typeof Events)[K] : never;
};

type ValidEventName = keyof ClientEvents | EventNameMap[keyof EventNameMap];

export interface Event<T extends ValidEventName = ValidEventName> {
  name?: T;
  once?: boolean;
  execute: T extends "ready" | Events.ClientReady
    ? (client: ClientEvents["ready"][0], manager: HandlerManager) => Promise<void> | void
    : (...args: T extends keyof ClientEvents ? ClientEvents[T] : never) => Promise<void> | void;
 options?: Options;
}