# Translate with Gemini Nano

Chrome extension to translate web pages using Chrome's built-in Gemini Nano via the Prompt API.

## ⚠️ Important Note

**This extension uses the generic Prompt API to implement translation functionality. However, Chrome now provides a dedicated [Translator API](https://developer.chrome.com/docs/ai/translator-api) that is specifically optimized for translation tasks and consumes significantly fewer resources.**

**For new projects, I strongly recommend using the Translator API instead.** I have created [NanoGlot](https://github.com/sh2/extension-nanoglot), a translation extension that leverages the Translator API.

This extension remains available as a demonstration of what can be achieved with the more general-purpose Prompt API.

## Prerequisites

As of Chrome 138, the Prompt API is **Generally Available (GA)**. No special flags or configuration are required.

Simply ensure:

- You are using **Chrome 138 or later**
- The Gemini Nano model is downloaded automatically when first used

For the latest status, see [Built-in AI on Chrome](https://developer.chrome.com/docs/ai/built-in-apis).

For detailed API documentation, see [Prompt API for Gemini Nano](https://developer.chrome.com/docs/ai/prompt-api).

## Setup

To install this extension manually:

1. Open 'Manage Extensions' page in Google Chrome browser.
2. Enable 'Developer mode'.
3. Click 'Load unpacked' and select `extension` directory.
4. Open 'Options' page and select the language.

## Usage

Select the text you want to translate and click on the extension icon.

![Translate](img/screenshot_translate.png)

## License

MIT License  
Copyright (c) 2024-2026 Sadao Hiratsuka
