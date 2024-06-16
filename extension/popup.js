/* globals marked */

let contentIndex = 0;

const getSelectedText = () => {
  return window.getSelection().toString();
};

const displayLoadingMessage = (loadingMessage) => {
  const status = document.getElementById("status");

  switch (status.textContent) {
    case `${loadingMessage}.`:
      status.textContent = `${loadingMessage}..`;
      break;
    case `${loadingMessage}..`:
      status.textContent = `${loadingMessage}...`;
      break;
    default:
      status.textContent = `${loadingMessage}.`;
  }
};

const main = async (useCache) => {
  let displayIntervalId = 0;
  let content = "";

  try {
    // Increment the content index
    contentIndex = (await chrome.storage.session.get({ contentIndex: -1 })).contentIndex;
    contentIndex = (contentIndex + 1) % 10;
    await chrome.storage.session.set({ contentIndex: contentIndex });

    // Clear the content, status, and disable buttons
    document.getElementById("content").textContent = "";
    document.getElementById("status").textContent = "";
    document.getElementById("run").disabled = true;
    document.getElementById("languageCode").disabled = true;
    document.getElementById("results").disabled = true;

    // Get the selected text
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    let taskInput = "";

    try {
      taskInput = (await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: getSelectedText
      }))[0].result;
    } catch {
      throw new Error("このページは翻訳できません。");
    }

    if (taskInput) {
      // Display a loading message
      displayIntervalId = setInterval(displayLoadingMessage, 500, chrome.i18n.getMessage("popup_translating"));

      // Get the task cache and language code
      const taskCache = (await chrome.storage.session.get({ taskCache: "" })).taskCache;
      const languageCode = document.getElementById("languageCode").value;

      if (useCache && taskCache === JSON.stringify({ taskInput, languageCode })) {
        // Use the cached response
        content = (await chrome.storage.session.get({ contentCache: {} })).contentCache;
      } else {
        // Generate content
        content = "ここに翻訳結果が表示されます。";
        const taskData = JSON.stringify({ taskInput, languageCode });
        await chrome.storage.session.set({ taskCache: taskData, contentCache: content });
      }
    } else {
      content = "翻訳したいテキストを選択してください。";
    }
  } catch (error) {
    content = error.message;
    console.log(error);
  } finally {
    if (displayIntervalId) {
      clearInterval(displayIntervalId);
    }

    // Convert the content from Markdown to HTML
    const div = document.createElement("div");
    div.textContent = content;
    document.getElementById("content").innerHTML = marked.parse(div.innerHTML);

    // Clear the status and enable buttons
    document.getElementById("status").textContent = "";
    document.getElementById("run").disabled = false;
    document.getElementById("languageCode").disabled = false;
    document.getElementById("results").disabled = false;

    // Save the content to the session storage
    await chrome.storage.session.set({ [`c_${contentIndex}`]: content });
  }
};

const initialize = async () => {
  // Disable links when converting from Markdown to HTML
  marked.use({ renderer: { link: (_href, _title, text) => text } });

  // Set the text direction of the body
  document.body.setAttribute("dir", chrome.i18n.getMessage("@@bidi_dir"));

  // Set the text of elements with the data-i18n attribute
  document.querySelectorAll("[data-i18n]").forEach(element => {
    element.textContent = chrome.i18n.getMessage(element.getAttribute("data-i18n"));
  });

  // Restore the language code from the local storage
  const { languageCode } = await chrome.storage.local.get({ languageCode: "en" });
  document.getElementById("languageCode").value = languageCode;

  main(true);
};

document.addEventListener("DOMContentLoaded", initialize);

document.getElementById("run").addEventListener("click", () => {
  main(false);
});

document.getElementById("results").addEventListener("click", () => {
  chrome.tabs.create({ url: chrome.runtime.getURL(`results.html?i=${contentIndex}`) });
});

document.getElementById("options").addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});
