declare namespace NodeJS {
    interface ProcessEnv {
      BOT_TOKEN: string;
      MONGODB_URI: string;
      CLIENT_ID?: string;
      GUILD_ID?: string;
      NODE_ENV?: "development" | "production";
    }
  }