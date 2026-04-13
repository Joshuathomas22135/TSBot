import mongoose from "mongoose";
import { logger } from "@/utils/logger.js";

export async function connectMongoDB(uri: string): Promise<void> {
    try {
        if (!uri) {
            throw new Error("MongoDB URI is not provided");
        }

        await mongoose.connect(uri);
        logger.success("DATABASE", "Connected to MongoDB");
    } catch (error) {
        logger.error("DATABASE", `Failed to connect: ${error}`);
        process.exit(1);
    }
}

export async function disconnectMongoDB(): Promise<void> {
    try {
        await mongoose.disconnect();
        logger.info("DATABASE", "Disconnected from MongoDB");
    } catch (error) {
        logger.error("DATABASE", `Failed to disconnect: ${error}`);
    }
}