import { Document } from "mongoose";

export interface IModeration extends Document {
    GuildID?: string;
    LogChannelID?: string;
    MultiGuilded?: boolean;
    MuteRoleID?: string;
    BanSuspicious?: boolean;
}