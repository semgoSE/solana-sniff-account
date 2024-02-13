import { config } from "dotenv";
import { Telegraf } from "telegraf";
import fs from "fs";
import { PrismaClient } from '@prisma/client'
import { Connection, PublicKey } from "@solana/web3.js";

interface Account {
    seed: string,
    address: string
}

const main = async () => {
    config();

    const chatId = Number(process.env.USER_ID ?? 0);

    if (chatId == 0) throw new Error("USER_ID not found");
    if (!process.env.TG_KEY) throw new Error("TG_KEY not found");
    if (!process.env.RPC) throw new Error("RPC not found");

    const tg = new Telegraf(process.env.TG_KEY);
    const prisma = new PrismaClient();
    const connection = new Connection(process.env.RPC);
    let countAccounts = 0;
    
    const interval = async () => {
        let accountsFile = fs.readFileSync(__dirname + "/../accounts.json", {
            encoding: "utf8",
        });
        let json: { accounts: Account[] } = JSON.parse(accountsFile);
        
        if (json.accounts.length != countAccounts) {
            countAccounts = json.accounts.length;
            await tg.telegram.sendMessage(chatId, `Изменилось кол-во аккаунтов ${countAccounts}`);
        }

        countAccounts = json.accounts.length;
        for(const account of json.accounts) {
            let tokens = await connection.getParsedTokenAccountsByOwner(new PublicKey(account.address), { programId: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA") })
            let amounts = tokens.value.map(e => ({ ...e.account.data.parsed.info, pubkey: e.pubkey }));
            for(const amount of amounts) {
                const accountBalance = await prisma.accountBalance.findFirst({
                    where: {
                        account: account.address,
                        pubkey: amount.pubkey
                    }
                })

                if (accountBalance) {
                    if (Number(accountBalance.amount) < Number(amount.tokenAmount.amount)) {
                        await tg.telegram.sendMessage(chatId, `На адресс ${account.address} пришли токены ${amount.pubkey}, \nseed: ${account.seed}`);
                    }
                    await prisma.accountBalance.update({
                        where: {
                            id: accountBalance.id,
                        },
                        data: {
                            amount: amount.tokenAmount.amount
                        }
                    })
                } else {
                    await prisma.accountBalance.create({
                        data: {
                            account: account.address,
                            pubkey: amount.pubkey,
                            amount: amount.tokenAmount.amount
                        }
                    })
                }
            }
        }
    }

    interval();
    setInterval(() => interval(), 10*60*1000);
    await tg.telegram.sendMessage(chatId, `Бот по отслеживанию запущен, кол-во аккаунтов ${countAccounts}`);
}

main();