import dotenv from 'dotenv'
import {Telegraf} from "telegraf";
import {PrismaClient} from "@prisma/client";
import {getRandom} from "./utils/getRandom.js";

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

bot.on('message', async (ctx) => {
    const chatId = ctx.update.message.chat.id.toString();
    const user = await prisma.user.findFirst({where: {chatId}});

    if (!user) {
        await prisma.user.create({data: {chatId}})
    }

    const randomCard = getRandomCard();
    if (!randomCard) {
        ctx.reply('Что-то пошло не так...')
    }

    const caption = randomCard.title + ` (${randomCard.category.name})\n\n`+ randomCard.description;
    ctx.sendMessage("Ваша карта на сегодня: ")
    ctx.sendPhoto(randomCard.imgUrl, {caption})
})

bot.command('stop', async (ctx) => {
    const chatId = ctx.update.message.chat.id.toString();
    await prisma.user.delete({where: {chatId}});
})


await bot.launch(() => console.log('Bot successfully started.'));


process.once('SIGINT', async () => {
    await prisma.$disconnect()
    bot.stop('SIGINT')
})

process.once('SIGTERM', async () => {
    await prisma.$disconnect()
    bot.stop('SIGTERM')
})
