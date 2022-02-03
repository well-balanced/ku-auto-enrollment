import { chromium, Frame, Page } from "playwright";

require("dotenv").config();
const ENROLL_DURATION = 200;
const LIMIT = 50;
const LOADING_DURATION = 1000;

async function autoEnrollment() {
  const subjects = process.env.SUBJECTS?.split(",");
  const username = process.env.USERNAME;
  const password = process.env.PASSWORD;

  while (true) {
    const browser = await chromium.launch({
      devtools: process.env.NODE_ENV !== "production",
    });

    try {
      const page = await browser.newPage();
      await page.goto("https://sugang.konkuk.ac.kr/", {
        waitUntil: "networkidle",
      });
      await login(page, username, password);
      await wait(LOADING_DURATION);

      const realFrame = filterFakeFrame(page);
      await entryEnrollmentPage(realFrame);
      await wait(LOADING_DURATION);

      let retryCount = 0;
      while (retryCount < LIMIT) {
        try {
          for (let subjectId of subjects) {
            await enrollCource(page, subjectId);
          }
        } catch (e) {
          console.log(`Server closed: ${e}`);
          process.exit(-1);
        }
        retryCount += 1;
      }
    } catch (e) {
      console.log(`Server closed: ${e}`);
    }

    await browser.close();
  }
}

function wait(duration: number) {
  return new Promise((resolve) => setTimeout(resolve, duration));
}

function log(message: string) {
  console.log(`[${new Date().toLocaleString()}] ${message}`);
}

async function login(
  page: Page,
  username: string,
  password: string
): Promise<void> {
  const loginPageHandle = await page.waitForSelector("iframe");
  const loginPageFrame = await loginPageHandle.contentFrame();

  const userNameInput = await loginPageFrame?.$("#stdNo");
  await userNameInput?.type(username);
  const passwordInput = await loginPageFrame?.$("#pwd");
  await passwordInput?.type(password);

  const loginButton = await loginPageFrame?.$("#btn-login");
  await loginButton?.click();
}

async function entryEnrollmentPage(frame: Frame): Promise<void> {
  const sugangButton = await frame.$("#menu_sugang");
  await sugangButton.click();
}

function filterFakeFrame(page: Page) {
  const [realFrame] = page
    .frames()
    .filter((frame) => frame.name() === "coreMain");
  return realFrame;
}

async function enrollCource(page: Page, subjectId: string) {
  const input = await page.waitForSelector("[name=strSbjtId]");
  await input?.evaluate((e: HTMLInputElement) => (e.value = ""));
  await wait(ENROLL_DURATION);
  await input?.type(subjectId);
  await page.evaluate(`window.actEvent('set')`);
}

autoEnrollment();
