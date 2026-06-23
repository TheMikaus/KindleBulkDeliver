const { chromium } = require("playwright");

const KINDLE_NAME = "YOUR KINDLE NAME";
const START_PAGE_NUMBER = 1; // change to resume, e.g. 12
const END_PAGE_NUMBER = 33;  // change as your library grows

const BASE_URL =
  "https://www.amazon.com/hz/mycd/digital-console/contentlist/booksAll/dateDsc";

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function pageUrl(pageNumber) {
  return `${BASE_URL}/?pageNumber=${pageNumber}`;
}

async function clickByText(page, text, timeout = 30000) {
  const deadline = Date.now() + timeout;

  while (Date.now() < deadline) {
    const candidates = [
      page.getByRole("button", { name: text, exact: false }),
      page.locator(`button:has-text("${text}")`),
      page.locator(`input[value*="${text}"]`),
      page.locator(`a:has-text("${text}")`),
      page.locator(`span:has-text("${text}")`),
      page.locator(`div[role="button"]:has-text("${text}")`),
    ];

    for (const loc of candidates) {
      const count = await loc.count().catch(() => 0);

      for (let i = 0; i < count; i++) {
        const el = loc.nth(i);

        try {
          if (!(await el.isVisible())) continue;

          const disabled =
            (await el.getAttribute("disabled")) !== null ||
            (await el.getAttribute("aria-disabled")) === "true";

          if (disabled) continue;

          await el.click({ force: true });
          console.log(`Clicked: ${text}`);
          return true;
        } catch {}
      }
    }

    await wait(500);
  }

  throw new Error(`Could not click: ${text}`);
}

async function clickKindle(page) {
  console.log(`Selecting Kindle: ${KINDLE_NAME}`);
  await wait(2000);

  const selected = await page.evaluate((kindleName) => {
    const values = [...document.querySelectorAll(
      ".ActionList-module_action_list_value__ijMh2"
    )];

    const value = values.find(el =>
      (el.textContent || "").trim().includes(kindleName)
    );

    if (!value) return { ok: false, reason: "name not found" };

    const row =
      value.closest('[class*="action_list_item"]') ||
      value.closest('[role="option"]') ||
      value.closest("li") ||
      value.parentElement;

    if (!row) return { ok: false, reason: "row not found" };

    row.scrollIntoView({ block: "center" });

    const input =
      row.querySelector('input[type="checkbox"], input[type="radio"]') ||
      row.querySelector("input");

    if (input) {
      input.click();
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
      return { ok: true, method: "input click" };
    }

    row.click();
    row.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    row.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
    row.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    return { ok: true, method: "row click" };
  }, KINDLE_NAME);

  console.log("Kindle selection result:", selected);

  if (!selected.ok) {
    await page.screenshot({ path: "kindle-popup-debug.png", fullPage: true });
    throw new Error(`Could not select Kindle: ${selected.reason}`);
  }

  await wait(1500);
}

async function confirmDelivery(page) {
  for (const text of ["Make Changes", "Deliver", "Done", "Save", "Apply"]) {
    try {
      await clickByText(page, text, 5000);
      console.log(`Confirmed with: ${text}`);
      return true;
    } catch {}
  }

  throw new Error("Could not find confirm button.");
}

async function closeSuccessBox(page) {
  console.log("Waiting for success box Close button...");

  try {
    await clickByText(page, "Close", 20000);
    console.log("Closed success box.");
    await wait(1500);
    return true;
  } catch {
    console.log("No Close button found; continuing.");
    return false;
  }
}

async function gotoLibraryPage(page, pageNumber) {
  const url = pageUrl(pageNumber);
  console.log(`Navigating to page ${pageNumber}: ${url}`);

  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle").catch(() => {});
  await wait(3000);
}

(async () => {
  const context = await chromium.launchPersistentContext("./amazon-profile", {
    headless: false,
    viewport: { width: 1600, height: 1200 },
  });

  const page = context.pages()[0] || (await context.newPage());

  await gotoLibraryPage(page, START_PAGE_NUMBER);

  console.log("");
  console.log("Log in if needed. Make sure the Kindle books list is visible.");
  console.log("Then press ENTER in this terminal.");
  console.log("");

  process.stdin.resume();
  await new Promise((resolve) => process.stdin.once("data", resolve));

  let pageNumber = START_PAGE_NUMBER;

  while (pageNumber <= END_PAGE_NUMBER) {
    console.log(`\n=== Processing page ${pageNumber} of ${END_PAGE_NUMBER} ===`);

    await clickByText(page, "Select All", 30000);

    console.log("Waiting for bulk action buttons to enable...");
    await wait(5000);

    await clickByText(page, "Deliver to device", 30000);

    console.log("Waiting for device popup...");
    await wait(3000);

    await clickKindle(page);

    await wait(1000);

    await confirmDelivery(page);

    await closeSuccessBox(page);

    console.log(`Submitted delivery for page ${pageNumber}.`);

    pageNumber++;

    if (pageNumber <= END_PAGE_NUMBER) {
      await gotoLibraryPage(page, pageNumber);
    }
  }

  console.log("Finished.");
})();
