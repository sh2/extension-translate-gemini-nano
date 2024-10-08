/* globals DOMPurify, marked */

let contentIndex = 0;

const checkNarrowScreen = () => {
  // Add the narrow class if the screen width is narrow
  if (document.getElementById("header").clientWidth < 640) {
    document.body.classList.add("narrow");
  } else {
    document.body.classList.remove("narrow");
  }
};

const getSelectedText = () => {
  // Return the selected text
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

const getSystemPrompt = (languageCode) => {
  const languageNames = {
    en: "English",
    de: "German",
    es: "Spanish",
    fr: "French",
    it: "Italian",
    pt_br: "Brazilian Portuguese",
    vi: "Vietnamese",
    ru: "Russian",
    ar: "Arabic",
    hi: "Hindi",
    bn: "Bengali",
    zh_cn: "Simplified Chinese",
    zh_tw: "Traditional Chinese",
    ja: "Japanese",
    ko: "Korean"
  };

  return `Translate the following text into ${languageNames[languageCode]}.`;
};

const checkAICapabilities = async () => {
  try {
    if (window.ai?.canCreateTextSession) {
      // Chrome 127-128
      if (await window.ai.canCreateTextSession() === "readily") {
        return true;
      }
    }

    if (window.ai?.assistant?.capabilities) {
      // Chrome 129+
      if ((await window.ai.assistant.capabilities()).available === "readily") {
        return true;
      }
    }

    return false;
  } catch (error) {
    console.error(error);
    return false;
  }
};

const createAISession = async () => {
  if (window.ai?.createTextSession) {
    // Chrome 127-128
    return await window.ai.createTextSession();
  }

  if (window.ai?.assistant?.create) {
    // Chrome 129+
    return await window.ai.assistant.create();
  }

  return null;
};

const main = async (useCache) => {
  let displayIntervalId = 0;
  let content = "";
  contentIndex = (await chrome.storage.session.get({ contentIndex: -1 })).contentIndex;
  contentIndex = (contentIndex + 1) % 10;
  await chrome.storage.session.set({ contentIndex: contentIndex });

  try {
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
      throw new Error(chrome.i18n.getMessage("popup_cannot_translate"));
    }

    if (taskInput) {
      // Display a loading message
      displayIntervalId = setInterval(displayLoadingMessage, 500, chrome.i18n.getMessage("popup_translating"));

      // Get the task cache and language code
      const taskCache = (await chrome.storage.session.get({ taskCache: "" })).taskCache;
      const languageCode = document.getElementById("languageCode").value;
      const systemPrompt = getSystemPrompt(languageCode);

      if (useCache && taskCache === JSON.stringify({ taskInput, languageCode })) {
        // Use the cached content
        content = (await chrome.storage.session.get({ contentCache: "" })).contentCache;
      } else {
        // Generate content
        await chrome.storage.session.set({ taskCache: "", contentCache: "" });

        if (await checkAICapabilities()) {
          const session = await createAISession();
          const stream = await session.promptStreaming(`${systemPrompt}\nText:\n${taskInput}`);
          const div = document.createElement("div");
          let isFirstChunk = true;

          for await (content of stream) {
            if (isFirstChunk) {
              clearInterval(displayIntervalId);
              document.getElementById("status").textContent = "";
              isFirstChunk = false;
            }

            div.textContent = content;
            document.getElementById("content").innerHTML = DOMPurify.sanitize(marked.parse(div.innerHTML));

            // Scroll to the bottom of the page
            window.scrollTo(0, document.body.scrollHeight);
          }

          // Cache the task and content
          const taskData = JSON.stringify({ taskInput, languageCode });
          await chrome.storage.session.set({ taskCache: taskData, contentCache: content });
        } else {
          content = chrome.i18n.getMessage("popup_ai_unavailable");
        }
      }
    } else {
      content = chrome.i18n.getMessage("popup_request_select");
    }
  } catch (error) {
    content = error.message;
    console.error(error);
  } finally {
    if (displayIntervalId) {
      clearInterval(displayIntervalId);
    }

    // Clear the status and enable buttons
    document.getElementById("status").textContent = "";
    document.getElementById("run").disabled = false;
    document.getElementById("languageCode").disabled = false;
    document.getElementById("results").disabled = false;

    // Convert the content from Markdown to HTML
    const div = document.createElement("div");
    div.textContent = content;
    document.getElementById("content").innerHTML = DOMPurify.sanitize(marked.parse(div.innerHTML));

    // Save the content to the session storage
    await chrome.storage.session.set({ [`c_${contentIndex}`]: content });
  }
};

const initialize = async () => {
  // Check if the screen is narrow
  checkNarrowScreen();

  // Disable links when converting from Markdown to HTML
  marked.use({ renderer: { link: ({ text }) => text } });

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
  chrome.tabs.create({ url: chrome.runtime.getURL(`results.html?i=${contentIndex}`) }, () => {
    window.close();
  });
});

document.getElementById("options").addEventListener("click", () => {
  chrome.runtime.openOptionsPage(() => {
    window.close();
  });
});

window.addEventListener("resize", checkNarrowScreen);
