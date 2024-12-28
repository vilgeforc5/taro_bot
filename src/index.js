import dotenv from 'dotenv'
import {Telegraf} from "telegraf";
import {PrismaClient} from "@prisma/client";
import {getRandom} from "./utils/getRandom.js";
import cron from 'node-cron'

dotenv.config()

const botKey = process.env.BOT_KEY;

if (!botKey) {
    console.error('Bot key not found!');
    process.exit(1);
}

const bot = new Telegraf(botKey);
const prisma = new PrismaClient()
await prisma.$connect();

const cards = await prisma.card.findMany({include: {category: true}});
const getRandomCard = () => cards[getRandom(0, cards.length - 1)]

const sendRandomCard = async (sendMessage, sendPhoto) => {
    const randomCard = getRandomCard();
    if (!randomCard) {
        sendMessage(['Что-то пошло не так...'])
    }

    const caption = randomCard.title + ` (${randomCard.category.name})\n\n` + randomCard.description;
    sendMessage(["Ваша карта на сегодня: "])
    await sendPhoto([randomCard.imgUrl, {caption}])
    sendMessage(["Следующая карта дня будет отправлена в 7 утра"])
}

bot.command('start', async (ctx) => {
    const chatId = ctx.update.message.chat.id.toString();
    const user = await prisma.user.findFirst({where: {chatId}});

    if (!user) {
        await prisma.user.create({data: {chatId}});
        sendRandomCard((args) => ctx.reply(args), (args) => ctx.sendPhoto(...args))
    }
})

bot.command('stop', async (ctx) => {
    const chatId = ctx.update.message.chat.id.toString();

    await prisma.user.delete({where: {chatId}});
})

bot.command('noop', (ctx) => {
    ctx.reply('ping')
})

await bot.launch(() => {
    console.log('bot started')
    cron.schedule('0 7 * * *', async () => {
        const users = await prisma.user.findMany();

        for (const {chatId} of users) {
            sendRandomCard((args) => bot.telegram.sendMessage(chatId, ...args), (args) => bot.telegram.sendPhoto(chatId, ...args))
        }
    })
});


process.once('SIGINT', async () => {
    await prisma.$disconnect()

    bot.stop('SIGINT')
})

process.once('SIGTERM', async () => {
    await prisma.$disconnect()

    bot.stop('SIGTERM')
})
