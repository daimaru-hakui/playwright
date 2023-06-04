import { chromium } from "@playwright/test";
import * as fs from "fs";
import { Parser } from "json2csv";
import 'dotenv/config';
import prompts from "prompts";

(async () => {
  let question = [{
    type: "text",
    name: "keyword",
    message: "キーワードを入力してください"
  }, {
    type: "text",
    name: "area",
    message: "地域を入力してください"
  }];
  prompts.start;
  const res = await prompts(question);
  console.log(res);

  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(process.env.TARGET_URL);
  await page.waitForTimeout(2000);

  const inputKeyword = page.locator('//*[@id="keyword-suggest"]/input');
  await inputKeyword.type(res.keyword);
  const inputArea = page.locator('//*[@id="area-suggest"]/input');
  await inputArea.type(res.area);
  const buttonLocator = page.locator('//*[@id="__layout"]/div/main/div[1]/div/div[2]/form/button');
  await buttonLocator.click();

  await page.waitForTimeout(2000);

  const buttonNext = page.locator('.m-read-more.u-hover');
  const buttonCount = await buttonNext.count();

  if (buttonCount > 0) {
    await buttonNext.click();
    await page.waitForTimeout(2000);
    await nextClick();
  }

  async function nextClick() {
    const buttonNext = page.locator('.m-read-more.u-hover');
    const buttonCount = await buttonNext.count();
    if (buttonCount > 0) {
      await buttonNext.click();
      await page.waitForTimeout(2000);
      await nextClick();
    }
  }

  const cardLocators = page.locator('.m-article-card__body');
  const cardCount = await cardLocators.count();

  if (cardCount === 0) {
    console.log("検索結果0件");
    await browser.close();
    return;
  }

  console.log(`全${cardCount}件`);

  const fetchedList = [];
  for (let i = 0; i < cardCount; i++) {
    const cardLocator = cardLocators.locator(`nth=${i}`);
    const titleLocator = cardLocator.locator('.m-article-card__header__title');
    const title = await titleLocator.innerText();
    const categoryLocator = cardLocator.locator('.m-article-card__header__category');
    const category = await categoryLocator.innerText();
    const leadLocator = cardLocator.locator('.m-article-card__lead');
    const telLocator = leadLocator.locator('text=電話番号');
    const tel = await telLocator.innerText();
    const addressLocator = leadLocator.locator('text=住所');
    const address = await addressLocator.innerText();

    fetchedList.push({
      title,
      category,
      tel: tel.split('】').pop(),
      address: address.split('】').pop()
    });
  }

  const parser = new Parser;
  const csv = parser.parse(fetchedList);
  fs.writeFileSync(`${res.keyword}_${res.area}.csv`, csv);
  await browser.close();

})();