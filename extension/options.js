// TODO: Implement a feature to guide whether Gemini Nano is available

import {
  applyTheme,
  applyFontSize,
  loadTemplate
} from "./utils.js";

const INITIAL_OPTIONS = {
  languageCode: "en",
  theme: "system",
  fontSize: "medium"
};

const showStatusMessage = (message, duration) => {
  const status = document.getElementById("status");
  status.textContent = message;

  setTimeout(() => {
    if (status.textContent === message) {
      status.textContent = "";
    }
  }, duration);
};

const getOptionsFromForm = () => {
  const options = {
    version: chrome.runtime.getManifest().version,
    languageCode: document.getElementById("languageCode").value,
    theme: document.getElementById("theme").value,
    fontSize: document.getElementById("fontSize").value
  };

  return options;
};

const setOptionsToForm = async () => {
  const options = await chrome.storage.local.get(INITIAL_OPTIONS);

  document.getElementById("languageCode").value = options.languageCode;
  document.getElementById("theme").value = options.theme;
  document.getElementById("fontSize").value = options.fontSize;
};

const saveOptions = async () => {
  const options = getOptionsFromForm();

  await chrome.storage.local.set(options);
  await chrome.storage.session.set({ taskCache: "", contentCache: "" });
  applyTheme((await chrome.storage.local.get({ theme: "system" })).theme);
  applyFontSize((await chrome.storage.local.get({ fontSize: "medium" })).fontSize);
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

  setOptionsToForm();
};

document.addEventListener("DOMContentLoaded", initialize);

document.getElementById("save").addEventListener("click", async () => {
  await saveOptions();
  showStatusMessage(chrome.i18n.getMessage("options_saved"), 1000);
});

