import { chromium, Frame, Page } from "playwright";

require("dotenv").config();
const MIN_ENROLL_DURATION = 400;
const MAX_ENROLL_DURATION = 500;
const LOADING_DURATION = 1000;

async function autoEnrollment() {
  const subjects = process.env.SUBJECTS?.split(",");
  const username = process.env.USERNAME;
  const password = process.env.PASSWORD;

  const browser = await chromium.launch({
    devtools: process.env.NODE_ENV !== "production",
  });

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
  while (true) {
    for (let subjectId of subjects) {
      await enrollCource(realFrame, subjectId);
      retryCount += 1;
    }
  }
}

function wait(duration: number) {
  return new Promise((resolve) => setTimeout(resolve, duration));
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

function getRandomDuraition(minDuration: number, maxDuration: number) {
  const min = Math.ceil(minDuration);
  const max = Math.floor(maxDuration);
  return Math.floor(Math.random() * (max - min) + min);
}

async function enrollCource(frame: Frame, subjectId: string) {
  const input = await frame.waitForSelector("[name=fSbjtId]");
  await input?.evaluate((e: HTMLInputElement) => (e.value = ""));
  await input?.type(subjectId);
  const enrollButton = await frame.$(".btn-main");
  const duration = getRandomDuraition(MIN_ENROLL_DURATION, MAX_ENROLL_DURATION);
  await wait(duration);
  await enrollButton?.click();
  const confirmButtonWrapper = await frame.waitForSelector(".jconfirm-buttons");
  confirmButtonWrapper.click();
}

try {
  autoEnrollment();
} catch (e) {
  console.log(`Server closed: ${e}`);
  process.exit(-1);
}
