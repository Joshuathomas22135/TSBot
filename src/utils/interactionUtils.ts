import { 
  Interaction, 
  ChatInputCommandInteraction, 
  ContextMenuCommandInteraction, 
  ButtonInteraction, 
  ModalSubmitInteraction, 
  StringSelectMenuInteraction, 
  DMChannel,
  NewsChannel,
  TextBasedChannel,
  TextChannel
} from "discord.js";

/**
* Type guard to check if an interaction can be replied to
*/
export function isReplyableInteraction(
interaction: Interaction
): interaction is ChatInputCommandInteraction | ContextMenuCommandInteraction | ButtonInteraction | ModalSubmitInteraction | StringSelectMenuInteraction {
return interaction.isChatInputCommand() || 
       interaction.isContextMenuCommand() || 
       interaction.isButton() || 
       interaction.isModalSubmit() || 
       interaction.isStringSelectMenu();
}

type MessageCollectableChannel = TextChannel | NewsChannel | DMChannel;

export function isMessageCollectableChannel(channel: TextBasedChannel): channel is MessageCollectableChannel {
    return channel instanceof TextChannel || 
           channel instanceof NewsChannel || 
           channel instanceof DMChannel;
}