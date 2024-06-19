import { render } from "@solid-xul/solid-xul";
import { createSignal } from "solid-js";
import Counter from './Counter'

const ELEM_ID = 'nora-test-button'
export const initTestButton = () => {
  const browser = document.getElementById("browser")
  if (!browser) {
    throw new Error('browser is null')
  }
  let target = document.getElementById(ELEM_ID)

  if (!target) {
    target = document.createElement('vbox')
    target.id = ELEM_ID
    browser.appendChild(target)
  }
  render(() => <Counter />, target)
};
