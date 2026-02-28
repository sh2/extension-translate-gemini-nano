import {
  applyTheme,
  applyFontSize,
  loadTemplate,
  displayLoadingMessage,
  convertMarkdownToHtml
} from "./utils.js";

let content = "";

const copyContent = async () => {
  const operationStatus = document.getElementById("operation-status");
  let clipboardContent = `${content.replace(/\n+$/, "")}\n\n`;

  // Copy the content to the clipboard
  await navigator.clipboard.writeText(clipboardContent);

  // Display a message indicating that the content was copied
  operationStatus.textContent = chrome.i18n.getMessage("popup_copied");
  setTimeout(() => operationStatus.textContent = "", 1000);
};

const getSelectedText = () => {
  // Return the selected text
  return window.getSelection().toString();
};

const getSystemPrompt = (languageCode) => {
  const languageNames = {
    en: "English",
    es: "Spanish",
    ja: "Japanese"
  };

  return `Translate the entire text into ${languageNames[languageCode]} ` +
    "and reply only with the translated result.";
};

const streamGenerateContent = async (taskInput, languageCode) => {
  const contentElement = document.getElementById("content");

  const session = await self.LanguageModel.create({
    expectedOutputs: [
      { type: "text", languages: [languageCode] }
    ]
  });

  const stream = await session.promptStreaming([
    {
      role: "system",
      content: getSystemPrompt(languageCode)
    },
    {
      role: "user",
      content: taskInput
    }
  ]);

  let result = "";

  for await (const chunk of stream) {
    result += chunk;
    contentElement.innerHTML = convertMarkdownToHtml(result, false);
  }

  return result;
};

const main = async (useCache) => {
  let displayIntervalId = 0;

  try {
    // Disable buttons and clear previous content
    document.getElementById("content").textContent = "";
    document.getElementById("status").textContent = "";
    document.getElementById("run").disabled = true;
    document.getElementById("languageCode").disabled = true;
    document.getElementById("copy").disabled = true;

    // Get the selected text
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    let taskInput = "";

    try {
      taskInput = (await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: getSelectedText
      }))[0].result;
    } catch (error) {
      throw new Error(chrome.i18n.getMessage("popup_error_injection_blocked"), { cause: error });
    }

    if (taskInput) {
      // Get the task cache and language code
      const taskCache = (await chrome.storage.session.get({ taskCache: "" })).taskCache;
      const languageCode = document.getElementById("languageCode").value;

      if (useCache && taskCache === JSON.stringify({ taskInput, languageCode })) {
        // Use the cached content
        content = (await chrome.storage.session.get({ contentCache: "" })).contentCache;
      } else {
        // Generate content
        await chrome.storage.session.set({ taskCache: "", contentCache: "" });

        // Display a loading message while generating content
        displayIntervalId = setInterval(displayLoadingMessage, 500, "status", chrome.i18n.getMessage("popup_translating"));
        content = await streamGenerateContent(taskInput, languageCode);
        clearInterval(displayIntervalId);
        displayIntervalId = 0;

        // Cache the task and content
        const taskData = JSON.stringify({ taskInput, languageCode });
        await chrome.storage.session.set({ taskCache: taskData, contentCache: content });
      }
    } else {
      content = chrome.i18n.getMessage("popup_error_no_selection");
    }
  } catch (error) {
    content = error.message;
    console.log(error);
  } finally {
    // Stop displaying the loading message if it's still being displayed
    clearInterval(displayIntervalId);

    // Convert the content from Markdown to HTML
    document.getElementById("content").innerHTML = convertMarkdownToHtml(content, false);

    // Enable buttons and clear status
    document.getElementById("status").textContent = "";
    document.getElementById("run").disabled = false;
    document.getElementById("languageCode").disabled = false;
    document.getElementById("copy").disabled = false;
  }
};

const initialize = async () => {
  // Apply the theme
  applyTheme((await chrome.storage.local.get({ theme: "system" })).theme);

  // Apply font size
  applyFontSize((await chrome.storage.local.get({ fontSize: "medium" })).fontSize);

  // Load the language code template
  const languageCodeTemplate = await loadTemplate("languageCodeTemplate");
  document.getElementById("languageCodeContainer").appendChild(languageCodeTemplate);

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

document.getElementById("copy").addEventListener("click", copyContent);

document.getElementById("options").addEventListener("click", () => {
  chrome.runtime.openOptionsPage(() => {
    window.close();
  });
});
