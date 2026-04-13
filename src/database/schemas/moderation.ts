import { model, Schema } from "mongoose";
import { IModeration } from "../types/IModeration.js";

const moderationSchema = new Schema<IModeration>(
    {
        GuildID: {
            type: String,
            required: true,
            unique: true,
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
        BanSuspicious: {
            type: Boolean,
        },
    }
);

export const ModerationModel = model<IModeration>("Moderation", moderationSchema);
export default ModerationModel;