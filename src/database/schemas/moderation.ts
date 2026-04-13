import { model, Schema } from "mongoose";
import { IModeration } from "../types/IModeration.js";

const moderationSchema = new Schema<IModeration>(
    {
        GuildID: {
            type: String,
        },
        LogChannelID: {
            type: String,
        },
        MultiGuilded: {
            type: Boolean,
        },
        MuteRoleID: {
            type: String,
        },
    },
    {

    }
);

export const ModerationModel = model<IModeration>("Moderation", moderationSchema);
export default ModerationModel;