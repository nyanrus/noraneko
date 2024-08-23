//* Firefox binary will be placed on `node_modules/puppeteer/.local-firefox`
//* https://github.com/puppeteer/puppeteer/issues/5743#issuecomment-621664876

//* This script is hardly referenced by userChromeJS(https://github.com/xiaoxiaoflood/firefox-scripts).
//* SOURCE LICENSE : MPL2.0
//* Thank you for xiaoxiaoflood and the contributors!

//* This reddit commend can be helpful to understand how userChromeJS works
//* https://www.reddit.com/r/FirefoxCSS/comments/iboo0m/comment/g1ysjkl/?utm_source=share&utm_medium=web3x&utm_name=web3xcss&utm_term=1&utm_content=share_button

//* and the firefox will load pref script in `$gre/defaults/pref`
//* https://searchfox.org/mozilla-central/rev/a85b25946f7f8eebf466bd7ad821b82b68a9231f/modules/libpref/Preferences.cpp#4899

//* it needs setting "general.config.obscure_value" to 0
//* https://searchfox.org/mozilla-central/rev/a85b25946f7f8eebf466bd7ad821b82b68a9231f/extensions/pref/autoconfig/src/nsReadConfig.cpp#191
//* https://searchfox.org/mozilla-central/rev/a85b25946f7f8eebf466bd7ad821b82b68a9231f/extensions/pref/autoconfig/src/nsReadConfig.cpp#302

//* it needs to disable sandbox to access global vars in window esp. console, maybe ChromeUtils
//* https://searchfox.org/mozilla-central/rev/a85b25946f7f8eebf466bd7ad821b82b68a9231f/extensions/pref/autoconfig/src/nsReadConfig.cpp#148
//* https://searchfox.org/mozilla-central/rev/a85b25946f7f8eebf466bd7ad821b82b68a9231f/extensions/pref/autoconfig/src/nsJSConfigTriggers.cpp#101
//* https://searchfox.org/mozilla-central/rev/a85b25946f7f8eebf466bd7ad821b82b68a9231f/extensions/pref/autoconfig/src/nsJSConfigTriggers.cpp#105
//* https://searchfox.org/mozilla-central/rev/a85b25946f7f8eebf466bd7ad821b82b68a9231f/extensions/pref/autoconfig/src/nsJSConfigTriggers.cpp#69

//* We should skip 1st line in config.js
//* https://searchfox.org/mozilla-central/rev/a85b25946f7f8eebf466bd7ad821b82b68a9231f/extensions/pref/autoconfig/src/nsJSConfigTriggers.cpp#114
