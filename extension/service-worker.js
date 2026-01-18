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

  return `Translate the image into ${languageNames[languageCode]} ` +
    "and reply only with the translated result.";
};

const streamGenerateContent = async (taskInput, languageCode) => {
  // TODO: Identify jobs to allow continuation of the same job  
  // TODO: If a different job is running, interrupt it

  const session = await self.LanguageModel.create();

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

  let content = "";

  for await (const chunk of stream) {
    content += chunk;

    await chrome.storage.session.set({
      stream_1: {
        status: "streaming",
        content: content
      }
    });
  }

  await chrome.storage.session.set({
    stream_1: {
      status: "completed",
      content: content
    }
  });
};

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.action === "startTranslation") {
    streamGenerateContent(message.taskInput, message.languageCode);
    sendResponse({ status: "started" });
  }
});
