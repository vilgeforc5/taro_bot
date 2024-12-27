import * as cheerio from "cheerio";

const siteUrl = "https://magya-online.ru/"
const baseUrl = siteUrl + "znachenie_kart_taro_karta_dnya/"

async function getCardInfo(url) {
    const fullPath = baseUrl + url
    const res = await fetch(fullPath);

    if (!res.ok) {
        throw new Error('path not found');
    }

    const text = await res.text();
    const $ = cheerio.load(text);

    return ({
        description: $('.text p').first().text().trim(),
        title: $('.text h2').first().text().trim(),
        imgUrl: siteUrl + $('.text img').first().attr().src
    });
}

async function getCardCategories() {
    const res = await fetch(baseUrl);
    if (!res.ok) {
        throw new Error('smth went bad')
    }

    const $ = cheerio.load(await res.text())

    const cardSections = $('.text div[style="text-align: center"]');
    const h2Data = [...$('.text a[name*="taro"] + h3')].map(item => item.children[0].data)
    const realHeadings = ['Старшие карты', ...h2Data]
    const map = {};
    let index = 0;

    for (const section of cardSections) {
        for (const href of section.children) {
            const subLink = href.attribs['href'].split('/').at(-1)
            const header = realHeadings[index];
            if (!map[header]) {
                map[header] = []
            }
            map[header].push(subLink)
        }

        index++;
    }

    return map
}

export async function initFillDb(prisma) {
    const categories = await getCardCategories();

    for (const [category, cardNames] of Object.entries(categories)) {
        const createdCategory = await prisma.category.create({data: {name: category}});
        const categoryId = createdCategory.id;
        const cardsData = [];

        for (const name of cardNames) {
            const data = await getCardInfo(name);

            cardsData.push({...data, categoryId})
        }

        await prisma.card.createMany({data: cardsData})
    }
}
