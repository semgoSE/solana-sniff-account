import { config } from "dotenv";
import { Telegraf } from "telegraf";
import fs from "fs";
import { PrismaClient } from '@prisma/client'

interface Account {
    seed: string,
    address: string
}

const main = async () => {
    config();

    const chatId = Number(process.env.USER_ID ?? 0);

    if (chatId == 0) throw new Error("USER_ID not found");
    if (!process.env.TG_KEY) throw new Error("TG_KEY not found");

    const tg = new Telegraf(process.env.TG_KEY);
    const prisma = new PrismaClient();

    setInterval(() => {
        let accountsFile = fs.readFileSync(__dirname + "/../accounts.json", {
            encoding: "utf8",
        });
        let json: { accounts: Account[] } = JSON.parse(accountsFile);
        console.log(json.accounts);

        for(const account in json.accounts) {
            console.log(account);

            //
            // t
        }

    }, 5*60*1000);

    // await tg.launch();
}

main();