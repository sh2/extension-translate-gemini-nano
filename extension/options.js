const restoreOptions = async () => {
  const options = await chrome.storage.local.get({
    languageCode: "en",
  });

  document.getElementById("languageCode").value = options.languageCode;
};

const saveOptions = async () => {
  const options = {
    languageCode: document.getElementById("languageCode").value,
  };

  await chrome.storage.local.set(options);
  await chrome.storage.session.set({ taskCache: "", contentCache: "" });
  const status = document.getElementById("status");
  status.textContent = chrome.i18n.getMessage("options_saved");
  setTimeout(() => status.textContent = "", 1000);
};

const initialize = () => {
  // Set the text direction of the body
  document.body.setAttribute("dir", chrome.i18n.getMessage("@@bidi_dir"));

  // Set the text of elements with the data-i18n attribute
  document.querySelectorAll("[data-i18n]").forEach(element => {
    element.textContent = chrome.i18n.getMessage(element.getAttribute("data-i18n"));
  });

  restoreOptions();
};

document.addEventListener("DOMContentLoaded", initialize);
document.getElementById("save").addEventListener("click", saveOptions);
