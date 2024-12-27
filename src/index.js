import {PrismaClient} from '@prisma/client'
import {initFillDb} from "./fillDb.js";
import dotenv from 'dotenv'

dotenv.config()
const prisma = new PrismaClient()
await prisma.$connect();

if (process.env.SHOULD_FILL_DB === 'true') {
    await initFillDb(prisma)
}

await prisma.$disconnect()



