import { type Page, expect } from '@playwright/test';


export const isValidEthereumAddress = (address: string): boolean => {
    const regex = /^(0x)?[0-9a-fA-F]{40}$/;
    return regex.test(address);
};

export const getClipboardText = async (page: Page) => {
    // @ts-ignore
    const text = await page.evaluate(() => navigator.clipboard.readText());
    return text;
};

export const closeOpenedPages = async (page: Page) => {
    const allPages = page.context().pages();
    if (allPages.length > 1) {
        for (const p of allPages) {
            if (p !== page) {
                await p.close();
            }
        }
    }
};

export const getCurrentAddress = async (page: Page) => {
    // Wait for the dashboard page to be fully loaded
    await page.waitForURL(/.*\/dashboard.*/);

    //await expect(page.getByLabel('Copy Address')).toBeVisible({ timeout: 120_000 });
    const copyIcon = page.getByTestId('copy-address-button');
    await expect(copyIcon).toBeEnabled({ timeout: 120_000 });

    // const flowAddr = await page.getByTestId('account-address').textContent();
    await copyIcon.click();

    const flowAddr = await getClipboardText(page);
    return flowAddr;
};

export const openAccountMenu = async ({ page }: { page: Page }) => {

    // Look for new account menu button or older menu button
    const accountMenuButton = page.getByTestId('account-menu-button');
    const menuButton = page.getByRole('button', { name: 'menu' })

    await accountMenuButton.or(menuButton).click();
};

export const lockExtension = async ({ page }: { page: Page }) => {
    // Assume we're logged in before calling this
    await openAccountMenu({ page });
    await page.getByRole('button', { name: 'Lock Wallet' }).click();
    const unlockBtn = await page.getByRole('button', { name: 'Unlock Wallet' });

    await expect(unlockBtn).toBeEnabled({ enabled: true, timeout: 60_000 });
};

export const loginToExtensionAccount = async ({ page, extensionId, addr, password, nickname }: { page: Page, extensionId: string, addr: string, password: string, nickname: string }) => {
    // close all pages except the current page
    await closeOpenedPages(page);

    // Navigate and wait for network to be idle
    await page.goto(`chrome-extension://${extensionId}/index.html#/unlock`);

    await page.waitForSelector('.logoContainer', { state: 'visible' });
    await closeOpenedPages(page);

    await fillInPassword({ page, password });

    const unlockBtn = await page.getByRole('button', { name: 'Unlock Wallet' });

    await expect(unlockBtn).toBeEnabled({ enabled: true, timeout: 60_000 });

    // close all pages except the current page (the extension opens them in the background)
    await unlockBtn.click();
    // get address
    let flowAddr = await getCurrentAddress(page);
    if (flowAddr !== addr && flowAddr && isValidEthereumAddress(flowAddr)) {
        await switchToMainAccount({ page, address: addr });
        flowAddr = await getCurrentAddress(page);
    }
    if (flowAddr !== addr) {
        // switch to the correct account
        await openAccountMenu({ page });
        await page.getByRole('button', { name: 'close' }).click();
        await expect(page.getByText('Profiles', { exact: true })).toBeVisible();
        // Switch to the correct account. Note doest not handle more than 3 accounts loaded
        await page.getByTestId(`profile-item-nickname-${nickname}`).click();
        await expect(page.getByRole('progressbar').getByRole('img')).not.toBeVisible();
        // get address
        flowAddr = await getCurrentAddress(page);
        if (flowAddr !== addr && flowAddr && isValidEthereumAddress(flowAddr)) {
            await switchToMainAccount({ page, address: addr });
            flowAddr = await getCurrentAddress(page);
        }
    }

    expect(flowAddr).toBe(addr);

    // Wait for the coins to be loaded
    await expect(page.getByTestId('coin-balance-flow')).toBeVisible({ timeout: 30_000 });
};

const getNumber = (str: string) => {
    const match = str.match(/\d+/);
    return match ? Number.parseInt(match[0]) : null;
};

export const fillInPassword = async ({ page, password }: { page: Page, password: string }) => {
    // Handle both create a password and confirm your password
    let filledAtLeastOneField = false;
    if (await page.getByLabel('Password').isVisible()) {
        await page.getByLabel('Password').clear();
        await page.getByLabel('Password').fill(password);
        filledAtLeastOneField = true;
    }

    const item1 = page.getByPlaceholder("Enter your password");
    if (await item1.isVisible()) {
        await item1.clear();
        await item1.fill(password);
        filledAtLeastOneField = true;
    }
    const item2 = page.getByPlaceholder("Create a password");
    if (await item2.isVisible()) {
        await item2.clear();
        await item2.fill(password);
        filledAtLeastOneField = true;
    }
    const item3 = page.getByPlaceholder("Confirm your password");
    if (await item3.isVisible()) {
        await item3.clear();
        await item3.fill(password);
        filledAtLeastOneField = true;
    }
    // Make sure we filled at least one field
    expect(filledAtLeastOneField).toBe(true);
};

export const registerAccount = async ({ page, extensionId, username, password }: { page: Page, extensionId: string, username: string, password: string }) => {
    // We're starting from a fresh install, so create a new wallet
    await closeOpenedPages(page);
    // Wait for the welcome page to be fully loaded
    await page.waitForSelector('.welcomeBox', { state: 'visible' });

    // Click on register button
    await page.getByRole('link', { name: 'Create a new wallet' }).click();

    // Wait for the register page to be fully loaded
    await page.getByText('Your username will be used to').isVisible();

    // Fill in the form
    await page.getByPlaceholder('Username').fill(username);

    // Click on register button
    await page.getByRole('button', { name: 'Next' }).click();

    await page
        .locator('div')
        .filter({ hasText: /^Click here to reveal phrase$/ })
        .getByRole('button')
        .click();

    await page.getByRole('button', { name: 'Copy' }).click();

    // got keys from clipboard
    const clipboardText: string | null = await getClipboardText(page);
    if (!clipboardText) {
        throw new Error('Clipboard text is not found');
    }

    const keyArr = clipboardText.split(' ');

    // next step
    await page.getByRole('button', { name: 'Okay, I have saved it properly' }).click();

    // get puzzles
    const firstIdx = await page.locator('div').getByText('#').first().textContent();
    const secondIdx = await page.locator('div').getByText('#').nth(1).textContent();
    const thirdIdx = await page.locator('div').getByText('#').nth(2).textContent();

    if (!firstIdx || !secondIdx || !thirdIdx) {
        throw new Error("Puzzles are not found");
    }

    const firstIdxNum = getNumber(firstIdx);
    const secondIdxNum = getNumber(secondIdx);
    const thirdIdxNum = getNumber(thirdIdx);

    if (!firstIdxNum || !secondIdxNum || !thirdIdxNum) {
        throw new Error("Puzzles are not found");
    }

    const firstMnemonic = keyArr[firstIdxNum - 1];
    const secondMnemonic = keyArr[secondIdxNum - 1];
    const thirdMnemonic = keyArr[thirdIdxNum - 1];

    // console.log(firstMnemonic, secondMnemonic, thirdMnemonic);
    // click the right mnemonic word

    // resolve mnemonics puzzles
    await page.getByLabel('row0').getByRole('button', { name: firstMnemonic }).click();
    await page.getByLabel('row1').getByRole('button', { name: secondMnemonic }).click();
    await page.getByLabel('row2').getByRole('button', { name: thirdMnemonic }).click();

    await page
        .locator('div')
        .filter({ hasText: /^Next$/ })
        .click();

    // fill
    await fillInPassword({ page, password });

    await page.getByLabel("I agree to Flow Wallet's").click();

    const registerBtn = await page.getByRole('button', { name: 'Register' });
    await registerBtn.click();
    await expect(page.getByRole('button', { name: 'Connect and Back up' })).toBeVisible({
        timeout: 120_000,
    });

    // await unlockBtn.isEnabled();
    await page.goto(`chrome-extension://${extensionId}/index.html#/dashboard`);

    // get address

    const flowAddr = await getCurrentAddress(page);

    // save keys and pwd to keys file
    return {
        privateKey: clipboardText,
        password: password,
        addr: flowAddr,
    };
};


export const importAccountBySeedPhrase = async ({
    page,
    extensionId,
    seedPhrase,
    username,
    password,
    accountAddr = '',
}: { page: Page, extensionId: string, seedPhrase: string, username: string, password: string, accountAddr?: string }) => {
    logWithTimestamp("Start importAccountBySeedPhrase");
    logWithTimestamp(`Current URL: ${page.url()}`);
    if (page.url().includes("dashboard")) {
        logWithTimestamp("On dashboard, opening account menu to import profile");
        // Wait for the dashboard page to be fully loaded
        await page.waitForURL(/.*\/dashboard.*/);
        await openAccountMenu({ page });

        // We're already logged in so we need to click import profile
        await page.getByTestId("add-account-button").click();
        await page.getByTestId("import-existing-account-button").click();
        // Close all pages except the current page (the extension opens them in the background)
        await closeOpenedPages(page);
    }

    logWithTimestamp("Navigating to import page");
    // Go to the import page
    await page.goto(`chrome-extension://${extensionId}/index.html#/welcome/accountimport`);

    // Close all pages except the current page (the extension opens them in the background)
    await closeOpenedPages(page);

    logWithTimestamp("Selecting Recovery Phrase/Seed Phrase tab");
    const tab = page.getByRole("tab", { name: /Recovery Phrase|Seed Phrase/i }).first();
    await tab.waitFor({ state: "visible" });
    await tab.click();

    logWithTimestamp("Filling seed phrase");

    const input = page.getByPlaceholder("Import 12 or 24 words split");
    await input.click();
    await input.fill(seedPhrase);

    logWithTimestamp("Clicking Import button");
    await page.getByRole("button", { name: "Import" }).click();
    // We need to wait for the next step to be visible

    logWithTimestamp("Waiting for Import button to disappear");
    await expect(page.getByRole("button", { name: "Import" })).not.toBeVisible();

    logWithTimestamp("Checking current step");
    const step = await page.getByText("STEP").textContent();
    logWithTimestamp(`Current step: ${step}`);

    if (step?.includes("4")) {
        logWithTimestamp("Account already imported, filling password and logging in");
        // We've already imported the account before
        await fillInPassword({ page, password });

        await page.getByRole("button", { name: "Login" }).click();
        // await page.getByRole('button', { name: 'Login' }).click();
    } else if (step?.includes("2")) {
        logWithTimestamp("New import, filling username and password");
        // We haven't imported the account before
        await page.getByPlaceholder("Username").fill(username);
        await page.getByRole("button", { name: "Next" }).click();

        await fillInPassword({
            page,
            password,
        });

        await page.getByRole("button", { name: "Login" }).click();
    }

    logWithTimestamp("Waiting for Connect and Back up button to be visible");
    // Wait for the Google Drive backup text to be visible
    await expect(page.getByRole("button", { name: "Connect and Back up" })).toBeVisible({
        timeout: 10_000,
    });

    logWithTimestamp("Navigating to dashboard");
    await page.goto(`chrome-extension://${extensionId}/index.html#/dashboard`);
    await page.waitForURL(/.*\/dashboard.*/);
    logWithTimestamp("About to get current address");
    // Wait for the account address to be visible
    let flowAddr = await getCurrentAddress(page);
    logWithTimestamp(`Got current address: ${flowAddr}`);
    logWithTimestamp(`Account address (expected): ${accountAddr}`);
    if (accountAddr && accountAddr !== "" && flowAddr !== accountAddr) {
        logWithTimestamp("Switching to main account");
        await switchToMainAccount({ page, address: accountAddr });
        flowAddr = await getCurrentAddress(page);
        logWithTimestamp(`After switch, got current address: ${flowAddr}`);
    }

    if (accountAddr && accountAddr !== "" && flowAddr !== accountAddr) {
        logWithTimestamp("Account address does not match, throwing error");
        throw new Error("Account address does not match");
    }

    logWithTimestamp("importAccountBySeedPhrase finished");
    return flowAddr;
};


export const switchToEvmAddress = async ({ page, address }: { page: Page, address: string }) => {

    // Assume the user is on the dashboard page
    await openAccountMenu({ page });

    // switch to COA account
    await page
        .getByTestId(new RegExp(`evm-account-${address}`, 'i'))
        .first()
        .click();
    // get address
    await getCurrentAddress(page);
};

export const switchToMainAccount = async ({ page, address }: { page: Page, address: string }) => {
    await openAccountMenu({ page });
    // switch to another flow account
    await page
        .getByTestId(new RegExp(`main-account-${address}`, 'i'))
        .first()
        .click();
    // get address
    await getCurrentAddress(page);
};
const getActivityItemRegexp = (txId: string, ingoreFlowCharge = false) => {
    return new RegExp(`^.*${txId}.*${ingoreFlowCharge ? '(?<!FlowToken)' : ''}$`);
};

export const checkSentAmount = async ({
    page,
    sealedText,
    amount,
    txId,
    ingoreFlowCharge = false,
}: { page: Page, sealedText: string, amount: string, txId: string, ingoreFlowCharge?: boolean }) => {
    const activityItemRegexp = getActivityItemRegexp(txId, ingoreFlowCharge);
    const sealedItem = page.getByTestId(activityItemRegexp).filter({ hasText: sealedText });
    await expect(sealedItem).toBeVisible({
        timeout: 60_000,
    });
    await expect(
        page.getByTestId(activityItemRegexp).getByTestId(`token-balance-${amount}`)
    ).toBeVisible();
};

export const waitForTransaction = async ({
    page,
    successtext = 'success',
    amount = '',
    ingoreFlowCharge = false,
}: {
    page: Page;
    successtext?: string | RegExp;
    amount?: string;
    ingoreFlowCharge?: boolean;
}) => {
    // Wait for the transaction to be completed
    await page.waitForURL(/.*dashboard\?activity=1.*/);
    const url = await page.url();

    const txId = url.match(/[\?&]txId=(\w+)/i)?.[1];

    expect(txId).toBeDefined();

    if (!txId) {
        throw new Error('Transaction ID is not found');
    }
    const progressBar = page.getByRole('progressbar');
    await expect(progressBar).toBeVisible();
    // Get the pending item with the cadence txId that was put in the url and status is pending

    const activityItemRegexp = getActivityItemRegexp(txId, ingoreFlowCharge);
    const pendingItem = page.getByTestId(activityItemRegexp).filter({ hasText: 'Pending' });

    await expect(pendingItem).toBeVisible({
        timeout: 60_000,
    });
    /// await expect(progressBar).not.toBeVisible({ timeout: 60_000 });

    // Get the executed item with the cadence txId that was put in the url and status is success
    const executedItem = page.getByTestId(activityItemRegexp).filter({ hasText: successtext });

    await expect(executedItem).toBeVisible({
        timeout: 60_000,
    });

    if (amount) {
        await expect(
            page.getByTestId(activityItemRegexp).getByTestId(`token-balance-${amount}`)
        ).toBeVisible();
    }

    return txId;
};

function logWithTimestamp(message: string) {
    const now = new Date();
    const timestamp = now.toISOString();
    // Add some color and formatting for better visibility
    console.log(`\x1b[36m[FlowWallet][${timestamp}]\x1b[0m ${message}`);
}



